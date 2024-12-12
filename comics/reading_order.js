
(function () {
    "use strict";

    const table = document.getElementById('comicTable');
    const tbody = table.querySelector('tbody');
    const formPopup = document.getElementById('formPopup');
    const confirmPopup = document.getElementById('confirmPopup');
    const scriptURL = "https://script.google.com/macros/s/AKfycbxBI5dklcmWaigQxB-Obpw3zmwf5EFQ-5ytzbrAaoRFsUx0y2yctMOWZ7WEwWxohBLAmg/exec"

    let currentRow = null,
        selectedRow = null,
        dragRow = null,
        mouseX = 0,
        mouseY = 0,
        startY = 0,
        mouseDrag = false;

    function init() {
        bindMouse();

        fetch(scriptURL,
            {
                headers: {
                    "Content-Type": "text/plain;charset=utf-8",
                },
            }
        )
            .then(res => res.json())
            .then(res => {
                const values = res.values;
                console.log(values);
                }
            )
    }

    document.getElementById("formPopup").addEventListener("submit", function (e) {
        e.preventDefault(); // Prevent the default form submission
        document.getElementById("message").textContent = "submitting changes...";
        document.getElementById("message").style.display = "block";
        document.getElementById("message").style.color = "white";
        document.getElementById("saveBtn").disabled = true;

        // Collect the form data
        let formData = new FormData(this);
        let keyValuePairs = [];
        for (var pair of formData.entries()) {
            keyValuePairs.push(pair[0] + "=" + pair[1]);
        }

        let formDataString = keyValuePairs.join("&");

        document.getElementById("formPopup").reset();
        // Send a POST request to your Google Apps Script
        fetch(
            scriptURL,
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
        formPopup.style.display = 'block';
    };

    document.getElementById('saveBtn').onclick = () => {
        const comic = document.getElementById('comicName').value;
        const creator = document.getElementById('creator').value;
        const reason = document.getElementById('reason').value;
        const rating = document.getElementById('rating').value;
        if (!comic) return;

        if (currentRow) {
            currentRow.children[1].innerText = comic;
            currentRow.children[2].innerText = creator;
            currentRow.children[3].innerText = reason;
            currentRow.children[4].innerText = rating;

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
        document.getElementById('comicName').value = currentRow.children[1].innerText;
        document.getElementById('creator').value = currentRow.children[2].innerText;
        document.getElementById('reason').value = currentRow.children[3].innerText;
        document.getElementById('rating').value = currentRow.children[4].innerText;
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
            if (event.button !== 0 || event.target.tagName !== "BUTTON") return true;

            if (event.target.parentNode.parentNode.tagName !== "TR") return true

            let targetRow = event.target.parentNode.parentNode;

            if (event.target.textContent === "edit") {
                editRow(targetRow)
                return true
            }

            selectedRow = targetRow;
            addDraggableRow(targetRow);
            selectedRow.classList.add('is-dragging');

            let coords = getMouseCoords(event);
            startY = coords.y;

            mouseDrag = true;

        });

        table.addEventListener("dblclick", (event) => {
            // Code to execute on double-click
            console.log("Double-click detected!");
        });

        document.addEventListener('mousemove', (event) => {
            if (!mouseDrag) return;

            let coords = getMouseCoords(event);
            mouseX = coords.x;
            mouseY = coords.y;

            moveRow(mouseX, mouseY);
        });

        document.addEventListener('mouseup', (event) => {
            if (!mouseDrag) return;

            selectedRow.classList.remove('is-dragging');
            table.removeChild(dragRow);

            dragRow = null;
            startY = null
            mouseDrag = false;
        });
    }

    function swapRow(row, index) {
        console.log(selectedRow.index);
        console.log(Array.from(tbody.children).indexOf(selectedRow));
        let currIndex = Array.from(tbody.children).indexOf(selectedRow),
            row1 = currIndex > index ? selectedRow : row,
            row2 = currIndex > index ? row : selectedRow;
        console.log(currIndex);

        tbody.insertBefore(row1, row2);
    }

    function moveRow(x, y) {
        if (!isInside(x, y, tbody.getBoundingClientRect())) return;

        y = y - startY;

        dragRow.style.transform = "translate3d(" + 0 + "px, " + y + "px, 0)";

        let dragRowBox = dragRow.getBoundingClientRect();

        for(let i = 0; i < tbody.rows.length; i++) {
            let currRow = tbody.rows[i],
                currRowBox = currRow.getBoundingClientRect();

            if(selectedRow !== currRow && isIntersecting(dragRowBox, currRowBox)) {
                console.log('yup')
                if(Math.abs(dragRowBox.y - currRowBox.y) < currRowBox.height / 2)
                    swapRow(currRow, i);
            }
        }
    }

    function getMouseCoords(event) {
        return {
            x: event.clientX,
            y: event.clientY
        };
    }

    function isInside(x, y, elemBox) {
        return (
            x >= elemBox.left &&
            x <= elemBox.right &&
            y >= elemBox.top &&
            y <= elemBox.bottom
        );
    }

    function isIntersecting(elem0, elem1) {
        let	bottom1 = elem0.y,
            top1 = bottom1 + elem0.height,
            bottom2 = elem1.y,
            top2 = bottom2 + elem1.height;

        return Math.max(bottom1, top1) >= Math.min(bottom2, top2) &&
            Math.min(bottom1, top1) <= Math.max(bottom2, top2);
    }

    function addDraggableRow(target) {
        dragRow = target.cloneNode(true);
        dragRow.classList.add('draggable-table__drag');
        dragRow.style.width = getStyle(target, 'width');
        for (let i = 0; i < target.children.length; i++) {
            let oldTD = target.children[i],
                newTD = dragRow.children[i];
            newTD.style.padding = getStyle(oldTD, 'padding');
            newTD.style.margin = getStyle(oldTD, 'margin');
        }

        table.appendChild(dragRow);

        let tPos = target.getBoundingClientRect(),
            dPos = dragRow.getBoundingClientRect();
        dragRow.style.bottom = ((dPos.y - tPos.y) - tPos.height) + "px";
        dragRow.style.left = "-1px";

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