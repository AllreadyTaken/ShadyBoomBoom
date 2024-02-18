
var collapser = document.querySelector('.collapser');
var sections = document.querySelectorAll('.section');

collapser.addEventListener('click', function() {

    sections.forEach(function(section) {
        if (section.style.display !== 'none') {
            section.style.display = 'none';
            collapser.textContent = '+';
        } 
        else {
            section.style.display = 'block';
            collapser.textContent = '-';
        }
    });
});