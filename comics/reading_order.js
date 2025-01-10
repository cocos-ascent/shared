
(function () {
    "use strict";

    const table = document.getElementById('comicTable'),
        tbody = table.querySelector('tbody'),
        formPopup = document.getElementById('formPopup'),
        confirmPopup = document.getElementById('confirmPopup'),
        loadingContainer = document.getElementById('loadingContainer'),
        loadingDots = document.getElementById('loadingDots'),
        messageDisplay = document.getElementById('message'),
        scriptURL = "https://script.google.com/macros/s/AKfycbycY2_lBcpx7CSN1vJ00-nnHthfT7n3WzTjNTIY0rDOfq3PNeUpbjIUDBMFeAirtq4tpQ/exec",
        numOfRowsToScroll = 5;

    let selectedRow = null,
        selectedRowPreviousIndex = null,
        rowHalfHeight = 0,
        dragRow = null,
        dragScrollInterval = null,
        currentIndex = 0,
        targetIndex = 0,
        lastClientY = 0,
        mouseDrag = false,
        intervalCount = 1,
        loadingIntervalID = setInterval(function () {
            intervalCount++;
            if (intervalCount % 5 === 0) intervalCount = 1;
            let dots = new Array(intervalCount % 5).join('.');
            loadingDots.innerHTML = "" + dots;
        }, 500);


    function init() {
        getGoogleSheetRows(scriptURL);
        document.addEventListener('mousedown', onPressed);
        document.addEventListener('touchstart', onPressed);
        document.addEventListener('mousemove', onDragged);
        document.addEventListener('touchmove', onDragged, {passive: false});
        document.addEventListener('mouseup', onReleased);
        document.addEventListener('touchend', onReleased);
    }

    document.getElementById('addBtn').onclick = () => {
        selectedRow = null;
        toggleGridContainer('disable');
        document.getElementById('deleteBtnContainer').style.display = 'none';
        formPopup.style.display = 'grid';
    };

    document.getElementById('saveBtn').onclick = () => {
        const comic = document.getElementById('comicName').value;
        if (!comic) return;
        const creator = document.getElementById('creator').value;
        const reason = document.getElementById('reason').value;
        const rating = document.getElementById('rating').value;

        let postData = []

        if (selectedRow) {
            selectedRow.children[1].innerText = comic;
            selectedRow.children[2].innerText = creator;
            selectedRow.children[3].innerText = reason;
            selectedRow.children[4].innerText = rating;
            postData = ['edit', selectedRow.rowIndex + 1, comic, creator, reason, rating]

        } else {
            addRow(comic, creator, reason, rating);
            postData = ['append', comic, creator, reason, rating];
        }


        document.getElementById("saveBtn").disabled = true;

        postSend(postData);
        document.getElementById("formPopup").reset();
        // Send a POST request to your Google Apps Script
        formPopup.style.display = 'none';
        toggleGridContainer('enable');
    };

    document.getElementById('cancelBtn').onclick = () => {
        formPopup.style.display = 'none';
        selectedRow = null;
        toggleGridContainer('enable');
    }

    window.editRow = (btn) => {
        toggleGridContainer('disable')
        selectedRow = btn.closest('tr');
        document.getElementById('comicName').value = selectedRow.children[1].innerText;
        document.getElementById('creator').value = selectedRow.children[2].innerText;
        document.getElementById('reason').value = selectedRow.children[3].innerText;
        document.getElementById('rating').value = selectedRow.children[4].innerText;
        formPopup.style.display = 'grid';
        document.getElementById('deleteBtnContainer').style.display = 'flex';
    };

    document.getElementById("deleteBtn").onclick = () => {
        //document.getElementById('formPopupBG').style.zIndex = 5;
        confirmPopup.style.display = 'flex';
        document.getElementById('formPopupBG').style.zIndex = 4;
    };

    document.getElementById('confirmDeleteBtn').onclick = () => {
        postSend(['delete', selectedRow.rowIndex + 1]);
        selectedRow.remove();
        selectedRow = null;

        confirmPopup.style.display = 'none';
        formPopup.style.display = 'none';
        document.getElementById('deleteBtnContainer').style.display = 'none';
        document.getElementById('formPopupBG').style.zIndex = 2;

        toggleGridContainer('enable')
    };

    document.getElementById('cancelDeleteBtn').onclick = () => {
        confirmPopup.style.display = 'none';
        document.getElementById('formPopupBG').style.zIndex = 2;
    }

    window.addEventListener('scroll', function() {
        moveRow(lastClientY); // Logs the vertical scroll position
    });

    async function getGoogleSheetRows(url) {
        try {
            const response = await fetch(url);
            const data = await response.json();

            for (let i = 0; i < data.length; i++) {
                let [comic, creator, reason, rating] = data[i];
                addRow(comic, creator, reason, rating);
                }
            executeAfterLoading();
        } catch (error) {
            console.log(error);
        }
    }

    function toggleGridContainer(state) {
        let rowButtons = document.getElementsByClassName("material-icons"),
            addButton = document.getElementsByClassName("add-button")[0],
            formPopupBG = document.getElementById("formPopupBG");

        switch (state) {
            case 'enable':
                for (let i = 0; i < rowButtons.length; i++) {
                    rowButtons[i].disabled = false;
                }
                addButton.disabled = false;
                formPopupBG.style.display = 'none';
                break;
            case 'disable':
                for (let i = 0; i < rowButtons.length; i++) {
                    rowButtons[i].disabled = true;
                }
                addButton.disabled = true;
                formPopupBG.style.display='block';
        }
    }

    function executeAfterLoading() {
        clearInterval(loadingIntervalID);
        loadingContainer.style.display = 'none';
        table.parentNode.style.display = 'grid';
        rowHalfHeight = table.rows[0].getBoundingClientRect().height / 2;
    }

    function addRow(comic, creator, reason, rating) {
        const row = table.tBodies[0].insertRow(-1);
        row.innerHTML = `
            <tr>
                <td>
                    <button class="material-icons">reorder</button>
                </td>
                <td>${comic}</td>
                <td>${creator}</td>
                <td>${reason}</td>
                <td>${rating}</td>
                <td><button class="material-icons">edit</button></td>
            </tr>`;
    }

    function onPressed(event) {
        if ((!event.touches && event.button !== 0) || event.target.tagName !== "BUTTON") return true;
        if (event.target.parentNode.parentNode.tagName !== "TR") return true;

        event = touchCheck(event);
        selectedRow = event.target.parentNode.parentNode;

        if (event.target.textContent === "edit") {
            editRow(selectedRow);
            return true;
        }

        selectedRowPreviousIndex = selectedRow.rowIndex
        addDraggableRow(selectedRow, event.clientY);
        lastClientY = event.clientY;
        moveRow(event.clientY);
        selectedRow.classList.add('is-dragging');
        mouseDrag = true;
    }

    function onDragged(event) {
        if (!mouseDrag) return;

        event = touchCheck(event);

        let posOrNeg = null,
            threshold = rowHalfHeight * 1.1;
        if (event.clientY < threshold) posOrNeg = -1
        else if (event.clientY > window.innerHeight - threshold) posOrNeg = 1

        if (posOrNeg) {
            if (!dragScrollInterval) {
                currentIndex = selectedRow.rowIndex - 1;
                targetIndex = currentIndex + (numOfRowsToScroll * posOrNeg);

                dragScroll();
                dragScrollInterval = setInterval(dragScroll, 1000)
            }
            return;
        } else {
            clearInterval(dragScrollInterval);
            dragScrollInterval = null;
            currentIndex = 0;
            targetIndex = 0;
        }
        lastClientY = event.clientY;
        moveRow(event.clientY);
    }

    function onReleased(event) {
        if (!mouseDrag) return;

        selectedRow.classList.remove('is-dragging');
        document.body.removeChild(dragRow);

        if (dragScrollInterval) {
            clearInterval(dragScrollInterval);
            dragScrollInterval = null;
        }

        if (selectedRowPreviousIndex !== selectedRow.rowIndex) {
            let postLoad = ["move", selectedRowPreviousIndex + 1, selectedRow.rowIndex + 1]
            console.log(postLoad);
            postSend(postLoad)
        }

        dragRow = null;
        mouseDrag = false;
        selectedRow = null;
        selectedRowPreviousIndex = null;
    }

    function dragScroll() {
        if (targetIndex < 0) {
            scrollTo(0, 0);
            return;
        } else if (targetIndex > tbody.children.length) {
            scrollTo(0, document.getElementById('gridContainer').scrollHeight);
            return;
        }

        let targetRow = null,
            targetY = null;

        if (targetIndex > currentIndex) { // scrolling down
            targetRow = tbody.children[targetIndex -1];
            let heightDifference = window.innerHeight - targetRow.getBoundingClientRect().height;

            targetY = targetRow.getBoundingClientRect().bottom + window.scrollY - heightDifference;
            currentIndex = currentIndex + numOfRowsToScroll;
            targetIndex = targetIndex + numOfRowsToScroll;
        }
        else { // scrolling up
            targetRow = tbody.children[targetIndex];

            targetY = targetRow.getBoundingClientRect().top + window.scrollY;
            currentIndex = currentIndex - numOfRowsToScroll;
            targetIndex = targetIndex - numOfRowsToScroll;
        }

        console.log('targetY =', targetY)
        scrollTo(0, targetY);
    }

    function swapRow(row, index) {
        let currIndex = Array.from(tbody.children).indexOf(selectedRow),
            row1 = currIndex > index ? selectedRow : row,
            row2 = currIndex > index ? row : selectedRow;
        tbody.insertBefore(row1, row2);
    }

    function swapCheck() {
        console.log('swap check')
        let dragRowRect = dragRow.getBoundingClientRect();

        for (let i = 0; i < tbody.rows.length; i++) {
            let currRow = tbody.rows[i],
                currRowBox = currRow.getBoundingClientRect();

            if (selectedRow !== currRow && isIntersecting(dragRowRect, currRowBox)) {
                if (Math.abs(dragRowRect.y - currRowBox.y) < rowHalfHeight)
                    swapRow(currRow, i);
            }
        }
    }

    function moveRow(y) {
        let tBodyRect = tbody.getBoundingClientRect();
        let newTop = y - rowHalfHeight;

        if (tBodyRect.top > y) {
            newTop = tBodyRect.top - rowHalfHeight;
        }
        else if (tBodyRect.bottom < y) {
            newTop = tBodyRect.bottom - rowHalfHeight;
        }

        dragRow.style.setProperty('top', newTop + 'px');
        swapCheck();
    }

    function isIntersecting(elem0, elem1) {
        let bottom1 = elem0.y,
            top1 = bottom1 + elem0.height,
            bottom2 = elem1.y,
            top2 = bottom2 + elem1.height;

        return Math.max(bottom1, top1) >= Math.min(bottom2, top2) &&
            Math.min(bottom1, top1) <= Math.max(bottom2, top2);
    }

    function touchCheck(event) {
        if (event.touches) {
            event.preventDefault();
            return event.touches[0];
        }
        return event;
    }

    function addDraggableRow(target, clientY) {
        dragRow = target.cloneNode(true);
        dragRow.classList.add('draggable-table__drag');
        dragRow.style.width = getStyle(target, 'width');

        for (let i = 0; i < target.children.length; i++) {
            let oldTD = target.children[i],
                newTD = dragRow.children[i];
            newTD.style.padding = getStyle(oldTD, 'padding');
            newTD.style.margin = getStyle(oldTD, 'margin');
        }

        dragRow.style.setProperty('left', target.getBoundingClientRect().left + 'px');
        dragRow.style.setProperty('top', clientY - rowHalfHeight + 'px');

        document.body.appendChild(dragRow);

        document.dispatchEvent(new MouseEvent('mousemove',
            {view: window, cancelable: true, bubbles: true}
        ));
    }

    function getStyle(target, styleName) {
        let compStyle = getComputedStyle(target),
            style = compStyle[styleName];

        return style ? style : null;
    }

    async function postSend(arrayPackage) {
        messageDisplay.textContent = "submitting changes...";
        messageDisplay.style.color = "rgba(255,255,0,0.8)";

        let jsonDataString = JSON.stringify(arrayPackage);
        fetch(
            scriptURL,
            {
                redirect: "follow",
                method: "POST",
                body: jsonDataString,
                headers: {
                    "Content-Type": "text/plain;charset=utf-8",
                },
            }
        )
            .then(function (response) {
                // Check if the request was successful
                if (response) {
                    return response; // Assuming your script returns JSON response
                } else {
                    throw new Error("An error occurred while submitting. Yell at Cody. (error 1)");
                }
            })
            .then(function (data) {
                // Display a success message
                document.getElementById("message").textContent =
                    "changes submitted successfully";

                document.getElementById("message").style.color = "rgba(0,255,0,0.8)";
                document.getElementById("saveBtn").disabled = false;

                setTimeout(function () {
                    document.getElementById("message").textContent = "";
                }, 1500);
            })
            .catch(function (error) {
                // Handle errors, you can display an error message here
                console.error(error);
                document.getElementById("message").textContent =
                    "An error occurred while submitting. Yell at Cody. (error 2)";
            });
    }

    function getColor(value) {
        //value from 0 to 1
        if (value === 0) return ["hsl(", 0, ",0%, 0%)"].join("");
        var hue = ((0 + value) * 120).toString(10);
        return ["hsl(", hue, ",80%,40%)"].join("");
    }

    function ratingToColor(rating) {
        return getColor(100 / rating);
    }

    var slider = document.getElementById("rating");
    var output = document.getElementById("demo");
    output.innerHTML = slider.value;

    slider.oninput = function() {
        output.innerHTML = "Your Rating (0 - 100) = " + this.value;
        this.style.backgroundColor = getColor(this.value / 100);
    }
//initial trigger so turns the right colour.
    slider.oninput();

    init();

})();