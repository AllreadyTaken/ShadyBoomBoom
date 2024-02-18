
editor = ace.edit('editor');
editor.session.setMode("ace/mode/glsl");
editor.setValue("precision mediump float; uniform vec2 resolution;\nvoid main() {\n    gl_FragColor = vec4(gl_FragCoord.x / resolution.x, gl_FragCoord.y / resolution.y, 0.0, 1.0);\n}");
editor.setTheme("ace/theme/monokai");
editor.setOption("wrap", true);


var err = null;
var shaderTemp ="";
var scene, camera, renderer, material, geometry, mesh;
var unicorns = {
    resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight / 2) },
    textureOne: { type: 't', value: null },
    textureTwo: { type: 't', value: null },
    iTime: { type: 'f', value: 0.0 }
};
var clock = new THREE.Clock();


function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight / 2);
    document.querySelector('#canvasContainer').appendChild(renderer.domElement);




    material = new THREE.ShaderMaterial({
        uniforms: unicorns,
        fragmentShader: editor.getValue()
    });
    geometry = new THREE.PlaneGeometry(16, 9);
    mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    camera.position.z = 1;
}

var extRenderer, extCam = null;
var externalWindow = document.getElementById('externalWindow');
var newWindow = null;

externalWindow.addEventListener('click', function() {
    if (!newWindow || newWindow.closed) {
        newWindow = window.open('', '', 'width=500,height=500');
        extCam = new THREE.PerspectiveCamera(75,500/ 500, 0.1, 1000);
        extRenderer =  new THREE.WebGLRenderer();
        extRenderer.setSize(500, 500);
        newWindow.document.body.appendChild(extRenderer.domElement);
        extCam.position.z = 1;
        newWindow.addEventListener("resize",function(){
        extCam.aspect = newWindow.innerWidth / newWindow.innerHeight;
        extRenderer.domElement.width = newWindow.innerWidth;
        extRenderer.domElement.height = newWindow.innerHeight;
        extCam.updateProjectionMatrix();
        extRenderer.setSize(newWindow.innerWidth, newWindow.innerHeight);
    } )


    } 
    else {
        newWindow.close();
        newWindow = null;
        extCam = extRenderer = null;
    }
});

function animate() {
    requestAnimationFrame(animate);
    var iTimeCheckbox = document.getElementById('timeEnabled');
if (iTimeCheckbox.checked) {
unicorns.iTime.value = clock.getElapsedTime();
}
    renderer.render(scene, camera);
   if(newWindow && !newWindow.closed  && extCam && extRenderer){
    extRenderer.render(scene, extCam);
   }

 }

function isShaderValid(gl, shaderSource) {
var shader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(shader, shaderSource);
gl.compileShader(shader);
if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
console.log(gl.getShaderInfoLog(shader));
setShaderError(editor, gl.getShaderInfoLog(shader));
return false;
}
return true;
}

function setShaderError(editor, errorLog) {
var regex = /ERROR: \d+:(\d+):/g;
var match;
var annotations = [];
while ((match = regex.exec(errorLog)) !== null) {
var lineNumber = parseInt(match[1]) - 1; // Ace counts lines from 0
annotations.push({
    row: lineNumber,
    column: 0,
    text: errorLog, // error message
    type: "error" // also warning and information
});
}
editor.getSession().setAnnotations(annotations);
}

function handleTextureInput(id, unicorn) {
var input = document.getElementById(id);
var checkbox = document.getElementById(unicorn + 'Enabled');
input.addEventListener('change', function() {
if (checkbox.checked) {
    var reader = new FileReader();
    reader.onload = function(e) {
        var texture = new THREE.TextureLoader().load(e.target.result);
        unicorns[unicorn].value = texture;
    };
    reader.readAsDataURL(input.files[0]);
} else {
    unicorns[unicorn].value = null;
}
});
}

function handleWebcamInput(id, unicorn) {
var input = document.getElementById(id);
var checkbox = document.getElementById(unicorn + 'Enabled');
var video = document.createElement('video');
var texture;

input.addEventListener('change', function() {
if (checkbox.checked && input.checked) {
    navigator.mediaDevices.getUserMedia({ video: true }).then(function(stream) {
        video.srcObject = stream;
        video.play();
        texture = new THREE.VideoTexture(video);
        unicorns[unicorn].value = texture;
    });
} else {
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
    }
    unicorns[unicorn].value = null;
    var fileInput = document.getElementById(unicorn + 'FileSelector');
    if (fileInput.files.length > 0 && checkbox.checked) {
        var reader = new FileReader();
        reader.onload = function(e) {
            var imageTexture = new THREE.TextureLoader().load(e.target.result);
            unicorns[unicorn].value = imageTexture;
        };
        reader.readAsDataURL(fileInput.files[0]);
    }
}
});

}

function handleEnabledCheckbox(id, unicorn) {
var checkbox = document.getElementById(id);
checkbox.addEventListener('change', function() {
if (checkbox.checked) {
    // If the checkbox is checked, reload the texture
    var input = document.getElementById(unicorn + 'FileSelector');
    if (input.files.length > 0) {
        var reader = new FileReader();
        reader.onload = function(e) {
            var texture = new THREE.TextureLoader().load(e.target.result);
            unicorns[unicorn].value = texture;
        };
        reader.readAsDataURL(input.files[0]);
    }
} else {

    unicorns[unicorn].value = null;
}
}); }

handleEnabledCheckbox('textureOneEnabled', 'textureOne');
handleEnabledCheckbox('textureTwoEnabled', 'textureTwo');
handleTextureInput('textureOneFileSelector', 'textureOne');
handleTextureInput('textureTwoFileSelector', 'textureTwo');
handleWebcamInput('textureOneUseWebCam', 'textureOne');
handleWebcamInput('textureTwoUseWebCam', 'textureTwo');



document.getElementById('playButton').addEventListener('click', function() {
editor.getSession().clearAnnotations();
var newShader = editor.getValue();
if (isShaderValid(renderer.getContext(), newShader)) {
material.fragmentShader = newShader;
material.needsUpdate = true;
} else {
console.log('Shader is not valid :(');
}
});

window.addEventListener('resize', onWindowResize, false);

function onWindowResize(){
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight / 2);
    material.uniforms.resolution.value.x = window.innerWidth;
    material.uniforms.resolution.value.y = window.innerHeight / 2;
    //ace bug?
    setTimeout(function() {
editor.resize();
}, 0);
}

init();
animate();

