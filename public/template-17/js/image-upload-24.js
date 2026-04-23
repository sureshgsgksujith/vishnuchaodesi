document.getElementById('fileInput').addEventListener('change', function(event) {
    var files = event.target.files; // Get selected files
    var fileObjects = []; // Array to store file objects

    // Iterate through each selected file
    for (var i = 0; i < files.length; i++) {
        var reader = new FileReader(); // Create a FileReader object

        // Closure to capture the file information
        reader.onload = (function(file) {
            return function(e) {
                // Create a new image element
                var img = document.createElement('img');
                img.src = e.target.result; // Set image source to data URL

                // Create a close button for removing the image
                var closeButton = document.createElement('button');
                closeButton.innerHTML = '×'; // Close symbol
                closeButton.addEventListener('click', function() {
                    // Remove the image from the preview
                    this.parentNode.remove();
                    // Remove the corresponding file object from the array
                    var index = fileObjects.indexOf(file);
                    if (index !== -1) {
                        fileObjects.splice(index, 1);
                    }
                    // Update the file input with the modified files list
                    event.target.files = new FileListArray(fileObjects);
                });

                // Create a container div for the image and close button
                var container = document.createElement('div');
                container.classList.add('image-container');
                container.appendChild(img);
                container.appendChild(closeButton);

                // Append the container to the imagePreview div
                document.getElementById('imagePreview').appendChild(container);
            };
        })(files[i]);

        // Store the file object in the array
        fileObjects.push(files[i]);

        // Read the selected file as a data URL
        reader.readAsDataURL(files[i]);
    }
});

// Custom FileListArray to update file input
function FileListArray(files) {
    var list = files || [];
    list.item = function(index) {
        return list[index] || null;
    };
    return list;
}