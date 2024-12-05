(function () {
    "use strict";

    const table = document.getElementById('comicTable');
    const tbody = table.querySelector('tbody');
    const formPopup = document.getElementById('formPopup');
    const confirmPopup = document.getElementById('confirmPopup');
    let currentRow = null;

    var currRow = null,
        dragElem = null,
        mouseDownY = 0,
        mouseX = 0,
        mouseY = 0,
        transy = 0,
        mouseDrag = false;

    function init() {
        bindMouse();
    }

    document.getElementById("formPopup").addEventListener("submit", function (e) {
        e.preventDefault(); // Prevent the default form submission
        document.getElementById("message").textContent = "submitting changes...";
        document.getElementById("message").style.display = "block";
        document.getElementById("message").style.color = "white";
        document.getElementById("saveBtn").disabled = true;

        // Collect the form data
        var formData = new FormData(this);
        var keyValuePairs = [];
        for (var pair of formData.entries()) {
            keyValuePairs.push(pair[0] + "=" + pair[1]);
        }

        var formDataString = keyValuePairs.join("&");

        // Send a POST request to your Google Apps Script
        fetch(
            "https://script.google.com/macros/s/AKfycbxBI5dklcmWaigQxB-Obpw3zmwf5EFQ-5ytzbrAaoRFsUx0y2yctMOWZ7WEwWxohBLAmg/exec",
            {
                redirect: "follow",
                method: "POST",
                body: formDataString,
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
                document.getElementById("message").style.display = "block";
                document.getElementById("message").style.backgroundColor = "green";
                document.getElementById("message").style.color = "white";
                document.getElementById("saveBtn").disabled = false;
                document.getElementById("formPopup").reset();

                setTimeout(function () {
                    document.getElementById("message").textContent = "";
                    document.getElementById("message").style.display = "none";
                }, 1500);
            })
            .catch(function (error) {
                // Handle errors, you can display an error message here
                console.error(error);
                document.getElementById("message").textContent =
                    "An error occurred while submitting. Yell at Cody. (error 2)";
                document.getElementById("message").style.display = "block";
            });
    });

    document.getElementById('addBtn').onclick = () => {
        currentRow = null;
        formPopup.style.display = 'grid';
    };

    document.getElementById('saveBtn').onclick = () => {
        const comic = document.getElementById('comicName').value;
        const creator = document.getElementById('creator').value;
        const reason = document.getElementById('reason').value;
        const rating = document.getElementById('rating').value;
        if (!comic) return;

        if (currentRow) {
            currentRow.children[0].innerText = comic;
            currentRow.children[1].innerText = creator;
            currentRow.children[2].innerText = reason;
            currentRow.children[3].innerText = rating;

        } else {
            const row = table.insertRow(-1);
            row.innerHTML = `
            <tr>
            <td>${comic}</td>
            <td>${creator}</td>
            <td>${reason}</td>
            <td>${rating}</td>
            </tr>`;
        }
        formPopup.style.display = 'none';

    };

    document.getElementById('cancelBtn').onclick = () => formPopup.style.display = 'none';


    window.editRow = (btn) => {
        currentRow = btn.closest('tr');
        document.getElementById('comicName').value = currentRow.children[0].innerText;
        document.getElementById('creator').value = currentRow.children[1].innerText;
        document.getElementById('reason').value = currentRow.children[2].innerText;
        document.getElementById('rating').value = currentRow.children[3].innerText;
        formPopup.style.display = 'block';
    };

    window.deleteRow = (btn) => {
        currentRow = btn.closest('tr');
        confirmPopup.style.display = 'flex';
    };

    document.getElementById('confirmDeleteBtn').onclick = () => {
        currentRow.remove();
        confirmPopup.style.display = 'none';
    };

    document.getElementById('cancelDeleteBtn').onclick = () => confirmPopup.style.display = 'none';


    function bindMouse() {
        document.addEventListener('mousedown', (event) => {
            if (event.button != 0) return true;

            let target = getTargetRow(event.target);
            if (target) {
                currRow = target;
                currRow.classList.add('is-dragging');

                let coords = getMouseCoords(event);
                mouseDownY = coords.y;
                addDraggableRow(target);

                mouseDrag = true;

            }
        });

        document.addEventListener('mousemove', (event) => {
            if (!mouseDrag) return;

            let coords = getMouseCoords(event);
            mouseX = coords.x;
            mouseY = coords.y;

            moveRow(mouseX, mouseY, mouseDownY);
        });

        document.addEventListener('mouseup', (event) => {
            if (!mouseDrag) return;

            currRow.classList.remove('is-dragging');
            table.removeChild(dragElem);

            dragElem = null;
            mouseDownY = null
            mouseDrag = false;
        });

        document.addEventListener("drag", function (event) {
            console.log("DRAG");
        }, true);
    }

    function swapRow(row, index) {
        let currIndex = Array.from(tbody.children).indexOf(currRow),
            row1 = currIndex > index ? currRow : row,
            row2 = currIndex > index ? row : currRow;

        tbody.insertBefore(row1, row2);
    }

    function moveRow(x, y, oy) {

        let rows = getRows();
        transy = y;

        if (isMouseInside(x, y, table)) {
            dragElem.style.transform = "translate3d(" + 0 + "px, " + transy + "px, 0)";
        }


        for (var i = 0; i < rows.length; i++) {
            let rowElem = rows[i];

            if (currRow !== rowElem && isMouseInside(x, y, rowElem)) {
                swapRow(rowElem, i);
            }
        }
    }

    function getRows() {
        return table.querySelectorAll('tbody tr');
    }

    function getTargetRow(target) {
        let elemName = target.tagName.toLowerCase();

        if (elemName == 'tr') return target;
        if (elemName == 'td') return target.closest('tr');
    }

    function getMouseCoords(event) {
        return {
            x: event.clientX,
            y: event.clientY
        };
    }

    function isMouseInside(mx, my, elem) {
        const rect = elem.getBoundingClientRect();
        return (
            mx >= rect.left &&
            mx <= rect.right &&
            my >= rect.top &&
            my <= rect.bottom
        );
    }

    function addDraggableRow(target) {
        dragElem = target.cloneNode(true);
        dragElem.classList.add('draggable-table__drag');
        dragElem.style.height = getStyle(target, 'height');
        dragElem.style.width = getStyle(target, 'width');
        dragElem.style.background = getStyle(target, 'backgroundColor');

        for (var i = 0; i < target.children.length; i++) {
            let oldTD = target.children[i],
                newTD = dragElem.children[i];
            newTD.style.width = getStyle(oldTD, 'width');
            newTD.style.height = getStyle(oldTD, 'height');
            newTD.style.padding = getStyle(oldTD, 'padding');
            newTD.style.margin = getStyle(oldTD, 'margin');
        }

        dragElem.style.position = "absolute";
        table.appendChild(dragElem);


        let tPos = target.getBoundingClientRect(),
            dPos = dragElem.getBoundingClientRect(),
            tabPos = table.getBoundingClientRect();
        
        dragElem.style.transform = "translate3d(" + 0 + "px, " + dPos.bottom - tPos.bottom + "px, 0)";


        document.dispatchEvent(new MouseEvent('mousemove',
            { view: window, cancelable: true, bubbles: true }
        ));
    }

    function getStyle(target, styleName) {
        let compStyle = getComputedStyle(target),
            style = compStyle[styleName];

        return style ? style : null;
    }

    init();
})();