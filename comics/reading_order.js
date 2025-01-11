
(function () {
    "use strict";

    const table = document.getElementById('comicTable'),
        tbody = table.querySelector('tbody'),

        addComicButton = document.getElementsByClassName("add-button")[0],

        formPopup = document.getElementById('formPopup'),
        formPopupBG = document.getElementById("formPopupBG"),
        formPopupSaveButton = document.getElementById('saveBtn'),
        formPopupCancelButton = document.getElementById('cancelBtn'),
        formPopupDeleteButton = document.getElementById('deleteBtn'),

        comicNameInputText = document.getElementById("comicName"),
        creatorInputText = document.getElementById("creator"),
        reasonInputText = document.getElementById("rating"),
        ratingInputSlider = document.getElementById("rating"),
        formPopupInputs = [comicNameInputText, creatorInputText, reasonInputText, ratingInputSlider],
        ratingDisplay = document.getElementById("ratingDisplay"),

        confirmPopup = document.getElementById('confirmPopup'),
        confirmPopupCancelButton = document.getElementById('confirmCancelBtn'),
        confirmPopupDeleteButton = document.getElementById('confirmDeleteBtn'),

        loadingContainer = document.getElementById('loadingContainer'),
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
            document.getElementById('loadingDots').innerHTML = "" + dots;
        }, 500);


    function init() {
        let gettingComicsPromise = fetchGoogleSheetRows(scriptURL);
        gettingComicsPromise.then(jsonRows => {
            setupGridAfterFetch(jsonRows);
        })


        tbody.addEventListener('mousedown', onPressed);
        tbody.addEventListener('touchstart', onPressed);
        document.addEventListener('mousemove', onDragged);
        document.addEventListener('touchmove', onDragged, {passive: false});
        document.addEventListener('mouseup', onReleased);
        document.addEventListener('touchend', onReleased);
        window.addEventListener('scroll', moveRow);

        addComicButton.addEventListener('click', function() {setDisplayPage('add')});

        formPopupSaveButton.addEventListener('click', saveComic);
        formPopupDeleteButton.addEventListener('click', function() {setDisplayPage('confirmDelete')});
        formPopupCancelButton.addEventListener('click', function() {setDisplayPage('main')});

        confirmPopupCancelButton.addEventListener('click', function() {setDisplayPage('edit')});
        confirmPopupDeleteButton.addEventListener('click', deleteComic);

        ratingInputSlider.addEventListener('input', updateRatingInputSlider);
    }

    function saveComic () {
        const comic = document.getElementById('comicName').value;
        if (!comic) return;
        const creator = document.getElementById('creator').value;
        const reason = document.getElementById('reason').value;
        let rating = document.getElementById('rating').value;

        let postData

        if (selectedRow) {
            selectedRow.children[1].innerText = comic;
            selectedRow.children[2].innerText = creator;
            selectedRow.children[3].innerText = reason;
            if (rating == 0) rating = '';
            selectedRow.children[4].innerText = rating;
            postData = ['edit', selectedRow.rowIndex + 1, comic, creator, reason, rating]

        } else {
            addRow(comic, creator, reason, rating);
            postData = ['append', comic, creator, reason, rating];
        }


        document.getElementById("saveBtn").disabled = true;

        postSend(postData);
        // Send a POST request to your Google Apps Script

        setDisplayPage('main');
    }
    function deleteComic () {
        postSend(['delete', selectedRow.rowIndex + 1]);
        selectedRow.remove();
        selectedRow = null;
        setDisplayPage('main');
    }

    function setDisplayPage(page) {

        switch (page) {
            case 'main':
                formPopup.style.display = 'none';
                confirmPopup.style.display = 'none';
                enableMainPage();
                break;

            case 'add':
                disableMainPage()
                document.getElementById('deleteBtnContainer').style.display = 'none';
                selectedRow = null;
                formPopup.reset();
                updateRatingInputSlider();
                formPopupBG.style.zIndex = 2;
                formPopup.style.display = 'grid';
                break;

            case 'edit':
                disableMainPage();
                document.getElementById('deleteBtnContainer').style.display = 'flex';
                ratingInputSlider.value = '';
                for (let i = 0; i < formPopupInputs.length; i++) {
                    formPopupInputs[i].value = selectedRow.children[i + 1].innerText;
                }
                updateRatingInputSlider()
                confirmPopup.style.display = 'none';
                formPopupBG.style.zIndex = 2;
                formPopup.style.display = 'grid';
                break;

            case 'confirmDelete':
                confirmPopup.style.display = 'flex';
                formPopupBG.style.zIndex = 4;
                break;
        }
    }
    function enableMainPage() {
        let rowButtons = document.getElementsByClassName("material-icons");

        for (let i = 0; i < rowButtons.length; i++) {
            rowButtons[i].disabled = false;
        }
        addComicButton.disabled = false;
        formPopupBG.style.display = 'none';
    }
    function disableMainPage() {
        let rowButtons = document.getElementsByClassName("material-icons");

        for (let i = 0; i < rowButtons.length; i++) {
            rowButtons[i].disabled = true;
        }
        addComicButton.disabled = true;
        formPopupBG.style.display='block';
    }

    async function fetchGoogleSheetRows(url) {
        try {
            const response = await fetch(url);
            return response.json();
        } catch (error) {
            console.log(error);
        }
    }
    function setupGridAfterFetch(jsonRows) {
        for (let i = 0; i < jsonRows.length; i++) {
            let [comic, creator, reason, rating] = jsonRows[i];
            addRow(comic, creator, reason, rating);
        }
        clearInterval(loadingIntervalID);
        loadingContainer.style.display = 'none';
        document.getElementById('gridContainer').style.display = 'grid';
        rowHalfHeight = table.rows[0].getBoundingClientRect().height / 2;

        if (mobileCheck()) {
            for (let i = 0; i < table.rows.length; i++) {
                for (let j = 2; j < 5; j++) {
                    table.rows[i].cells[j].style.display = 'none';
                }
            }
        }
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
            .then(function () {
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

    function addRow(comic=comicNameInputText.value, creator=creatorInputText.value,
                    reason=reasonInputText.value, rating=ratingInputSlider.value) {
        const row = tbody.insertRow(-1);
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
        console.log(mobileCheck())
        if ((!event.touches && event.button !== 0) || event.target.tagName !== "BUTTON") return true;

        event = touchCheck(event);
        selectedRow = event.target.parentNode.parentNode;

        if (event.target.textContent === "edit") {
            setDisplayPage('edit')
            return true;
        }

        selectedRowPreviousIndex = selectedRow.rowIndex
        addDraggableRow(selectedRow, event.clientY);
        lastClientY = event.clientY;
        moveRow(event.clientY);
        selectedRow.classList.add('is-dragging');
        mouseDrag = true;
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
    function moveRow(y) {
        if (!mouseDrag) return;
        if (y.type === 'scroll') y = lastClientY;

        let tBodyRect = tbody.getBoundingClientRect();
        let newTop = y - rowHalfHeight;
        console.log('top =', tBodyRect.top, 'y =', y)
        if (tBodyRect.top > y) {
            newTop = tBodyRect.top - rowHalfHeight;
        }
        else if (tBodyRect.bottom < y) {
            newTop = tBodyRect.bottom - rowHalfHeight;
        }
        dragRow.style.setProperty('top', newTop + 'px');
        swapCheck();
    }
    function swapRow(row, index) {
        let currIndex = Array.from(tbody.children).indexOf(selectedRow),
            row1 = currIndex > index ? selectedRow : row,
            row2 = currIndex > index ? row : selectedRow;
        tbody.insertBefore(row1, row2);
    }
    function dragScroll() {
        if (targetIndex < 0) {
            scrollTo(0, 0);
            return;
        } else if (targetIndex > tbody.children.length) {
            scrollTo(0, document.getElementById('gridContainer').scrollHeight);
            return;
        }

        let targetRow,
            targetY;

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

        scrollTo(0, targetY);
    }

    function onReleased() {
        if (!mouseDrag) return;

        selectedRow.classList.remove('is-dragging');
        document.body.removeChild(dragRow);

        if (dragScrollInterval) {
            clearInterval(dragScrollInterval);
            dragScrollInterval = null;
        }

        if (selectedRowPreviousIndex !== selectedRow.rowIndex) {
            let postLoad = ["move", selectedRowPreviousIndex + 1, selectedRow.rowIndex + 1]
            postSend(postLoad)
        }

        dragRow = null;
        mouseDrag = false;
        selectedRow = null;
        selectedRowPreviousIndex = null;
    }

    function isIntersecting(elem0, elem1) {
        let bottom1 = elem0.y,
            top1 = bottom1 + elem0.height,
            bottom2 = elem1.y,
            top2 = bottom2 + elem1.height;

        return Math.max(bottom1, top1) >= Math.min(bottom2, top2) &&
            Math.min(bottom1, top1) <= Math.max(bottom2, top2);
    }
    function swapCheck() {
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
    function touchCheck(event) {
        if (event.touches) {
            event.preventDefault();
            return event.touches[0];
        }
        return event;
    }

    function updateRatingInputSlider(event = null) {
        if (!event && (!selectedRow || selectedRow.children[4].innerText === '')) {
            ratingDisplay.innerHTML = '"Your Rating: ~';
            ratingDisplay.style.color = '#ccc'
            ratingInputSlider.style.backgroundColor = '#333'
            ratingInputSlider.value = 50;
            return;
        } else if (event && ratingInputSlider.value == 0) {
            ratingDisplay.innerHTML = "Your Rating will be cleared.";
        } else {
            ratingDisplay.innerHTML = "Your Rating: " + ratingInputSlider.value;
        }

        let newColor = ratingToColor(ratingInputSlider.value);
        ratingDisplay.style.color = newColor;
        ratingInputSlider.style.backgroundColor = newColor;
    }
    function getStyle(target, styleName) {
        let compStyle = getComputedStyle(target),
            style = compStyle[styleName];

        return style ? style : null;
    }
    function ratingToColor(rating) {
        let value = rating / 100
        //value from 0 to 1
        if (value === 0) return ["hsl(", 0, ",0%, 0%)"].join("");
        let hue = ((value) * 120).toString(10);
        return ["hsl(", hue, ",80%,40%)"].join("");
    }

    window.mobileCheck = function() {
        let check = false;
        (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
        return check;
    };

    init();

})();