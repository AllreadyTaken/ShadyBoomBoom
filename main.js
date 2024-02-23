

let beatle = 0;
let lastBeatTime = 0;
let updateBeat = false;
let analyser, audiosource, audioContext = null;
let previousPower = null; 

let unicorns = {
    resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight / 2) },
    textureOne: { type: 't', value: null },
    textureTwo: { type: 't', value: null },
    iTime: { type: 'f', value: 0.0 },
    beat: {type: 'v3', value: new THREE.Vector3(0, 0, 0)}
};

let beatcheckbox = document.getElementById("beatchecker");



beatcheckbox.addEventListener('change', function() {
    if (beatcheckbox.checked) {
      updateBeat = true;
    navigator.mediaDevices.getUserMedia({ audio: true })
  .then(function(stream) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024; 
    audiosource = audioContext.createMediaStreamSource(stream);
    previousPower = new Float32Array(analyser.frequencyBinCount);
    audiosource.connect(analyser);
  })
  .catch(function(err) {
    console.error(err + " Beat sad :-(");
  }); }else{
    if (audiosource) {
        audioContext = null;
        audiosource.disconnect();
        audiosource.mediaStream.getTracks().forEach(track => track.stop());
        audiosource = null;
        updateBeat = false;
        unicorns.beat.value.set(0.0, 0.0, 0.0);
      }
  }
});




editor = ace.edit('editor');
editor.session.setMode("ace/mode/glsl");
editor.setValue("precision mediump float; \nuniform vec2 resolution;" 
+ "\nvoid main() {\n    gl_FragColor = vec4(gl_FragCoord.x / resolution.x, gl_FragCoord.y / resolution.y, 0.0, 1.0);\n}");
editor.setTheme("ace/theme/monokai");
editor.setOption("wrap", true);

let fileNumber = 1;

document.getElementById('saveButton').addEventListener('click', function() {
    let filename = document.getElementById('filename').value;
    if (!filename) {
        filename = 'file' + fileNumber;
        fileNumber++;
    }
    let content = editor.getValue();
    let blob = new Blob([content], {type: 'text/plain'});
    let url = URL.createObjectURL(blob);
    let link = document.createElement('a');
    link.download = filename + '.sbb';
    link.href = url;
    link.click();
});

document.getElementById('loadButton').addEventListener('click', function() {
    let fileSelector = document.createElement('input');
    fileSelector.type = 'file';
    fileSelector.accept = '.sbb'; // Limit the file selector to .txt files
    fileSelector.style.display = 'none';
    fileSelector.addEventListener('change', function() {
        let file = this.files[0];
        let reader = new FileReader();
        reader.onload = function() {
            editor.setValue(reader.result);
            // Update the filename input field with the name of the loaded file, without the .txt extension
            document.getElementById('filename').value = file.name.replace('.sbb', '');
        };
        reader.readAsText(file);
        // Remove the file input element from the document after the file has been selected
        document.body.removeChild(fileSelector);
    });
    document.body.appendChild(fileSelector);
    fileSelector.click();
});

let err = null;
let shaderTemp ="";
let scene, camera, renderer, material, geometry, mesh;



let clock = new THREE.Clock();


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

let extRenderer, extCam = null;
let externalWindow = document.getElementById('externalWindow');
let newWindow = null;

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
    let iTimeCheckbox = document.getElementById('timeEnabled');
    if(updateBeat && analyser){

        const fftData = new Float32Array(analyser.frequencyBinCount);
        analyser.getFloatFrequencyData(fftData);

        const powerSpectrum = fftData.map(value => Math.pow(10, value / 10)); // db to power

        // frequency bands
        const lowFreqBand = [0, fftData.length / 3];
        const midFreqBand = [fftData.length / 3, (2 * fftData.length) / 3];
        const highFreqBand = [(2 * fftData.length) / 3, fftData.length];

        const lowFreqPower = powerSpectrum.slice(lowFreqBand[0], lowFreqBand[1]);
        const midFreqPower = powerSpectrum.slice(midFreqBand[0], midFreqBand[1]);
        const highFreqPower = powerSpectrum.slice(highFreqBand[0], highFreqBand[1]);
        //Normalize
        const lowFreqValue = lowFreqPower.reduce((a, b) => a + b) / (lowFreqPower.length * Math.max(...lowFreqPower));
        const midFreqValue = midFreqPower.reduce((a, b) => a + b) / (midFreqPower.length * Math.max(...midFreqPower));
        const highFreqValue = highFreqPower.reduce((a, b) => a + b) / (highFreqPower.length * Math.max(...highFreqPower));


        console.log(`Low freq: ${lowFreqValue}, Mid freq: ${midFreqValue}, High freq: ${highFreqValue}`);
        unicorns.beat.value.set(lowFreqValue, midFreqValue, highFreqValue);
    }
    if (iTimeCheckbox.checked) {
        unicorns.iTime.value = clock.getElapsedTime();
    }
    renderer.render(scene, camera);
    if(newWindow && !newWindow.closed  && extCam && extRenderer){
        extRenderer.render(scene, extCam);
    }
}

function isShaderValid(gl, shaderSource) {
let shader = gl.createShader(gl.FRAGMENT_SHADER);
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
let regex = /ERROR: \d+:(\d+):/g;
let match;
let annotations = [];
while ((match = regex.exec(errorLog)) !== null) {
let lineNumber = parseInt(match[1]) - 1; // Ace counts lines from 0
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
let input = document.getElementById(id);
let checkbox = document.getElementById(unicorn + 'Enabled');
input.addEventListener('change', function() {
if (checkbox.checked) {
    let reader = new FileReader();
    reader.onload = function(e) {
        let texture = new THREE.TextureLoader().load(e.target.result);
        unicorns[unicorn].value = texture;
    };
    reader.readAsDataURL(input.files[0]);
} else {
    unicorns[unicorn].value = null;
}
});
}

function handleWebcamInput(id, unicorn) {
let input = document.getElementById(id);
let checkbox = document.getElementById(unicorn + 'Enabled');
let video = document.createElement('video');
let texture;

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
        video.srcObject.disconnect();
        video.srcObject.getTracks().forEach(track => track.stop());
    }
    unicorns[unicorn].value = null;
    let fileInput = document.getElementById(unicorn + 'FileSelector');
    if (fileInput.files.length > 0 && checkbox.checked) {
        let reader = new FileReader();
        reader.onload = function(e) {
            let imageTexture = new THREE.TextureLoader().load(e.target.result);
            unicorns[unicorn].value = imageTexture;
        };
        reader.readAsDataURL(fileInput.files[0]);
    }
}
});

}

function handleEnabledCheckbox(id, unicorn) {
let checkbox = document.getElementById(id);
checkbox.addEventListener('change', function() {
if (checkbox.checked) {
    // If the checkbox is checked, reload the texture
    let input = document.getElementById(unicorn + 'FileSelector');
    if (input.files.length > 0) {
        let reader = new FileReader();
        reader.onload = function(e) {
            let texture = new THREE.TextureLoader().load(e.target.result);
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
let newShader = editor.getValue();
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

