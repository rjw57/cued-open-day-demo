function init() {

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
var renderer = new THREE.WebGLRenderer();

camera.position.z = 1;

renderer.setSize( window.innerWidth, window.innerHeight );
document.getElementById('container').appendChild( renderer.domElement );

function onWindowResize() {
	windowHalfX = window.innerWidth / 2;
	windowHalfY = window.innerHeight / 2;

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );
}
window.addEventListener( 'resize', onWindowResize, false );

var gui = new dat.GUI({
	height: 64*31 - 1
});

var componentsGui = gui.addFolder('Components');

var components = { mean: 1. };

var guiParams = {
    reset: function() {
        components['mean'] = 1.;
        for(var i=0; i<64; ++i) { components['component ' + i] = 0.; }
        guiParams.image = '';
    },
    image: '',
};
var imageWidget = gui.add(guiParams, 'image').listen();
gui.add(guiParams, 'reset');

componentsGui.add(components, 'mean', 0.5, 1.5).listen();
for(var i=0; i<64; ++i) {
	components['component ' + i] = 0.;
	componentsGui.add(components, 'component ' + i, -0.2, 0.2).listen();
}

var r = "tex/skybox/";
var urls = [
	r + "px.jpg", r + "nx.jpg",
	r + "py.jpg", r + "ny.jpg",
	r + "pz.jpg", r + "nz.jpg"
];

var textureCube = THREE.ImageUtils.loadTextureCube( urls );
textureCube.format = THREE.RGBFormat;

var carMaterial = new THREE.ShaderMaterial({
	fragmentShader:
"varying vec2 vUv;\n" +
"uniform sampler2D meanTex;\n" +
"uniform sampler2D componentsTex;\n" +
"uniform float weights[64];\n" +
"uniform float muWeight;\n" +
"uniform samplerCube skyTex;" +
"varying vec3 vNormal;" +
"vec4 component(int idx, vec2 p) {\n" +
"    float cx = mod(float(idx), 8.);\n" +
"    float cy = 7.-(float(idx) - cx) / 8.;\n" +
"    p = mod(p, 1.);\n" +
"    p.x += cx; p.y += cy;\n" +
"    p /= 8.;\n" +
"    vec4 c = texture2D(componentsTex, p);\n" +
"    c.rgb -= 0.5; c.rgb *= 2.;\n" +
"    return c;\n" +
"}" +
"void main(void) {\n" +
"    vec4 mu = texture2D(meanTex, vUv);\n" +
"    vec4 c = muWeight * mu;\n" +
"    for(int i=0; i<64; ++i) { c += weights[i]*component(i, vUv); }\n" +
"    gl_FragColor = c;" +
"}\n",
	vertexShader:
"varying vec2 vUv;" +
"varying vec3 vNormal;" +
"void main(void) {" +
"    vUv = uv;" +
"    vNormal = (modelViewMatrix * vec4(normal, 0)).xyz;" +
"    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0 );" +
"}\n",
	side: THREE.DoubleSide,
	uniforms: {
		meanTex: { type: 't' },
		componentsTex: { type: 't' },
		weights: { type: 'fv1', value: [] },
		muWeight: { type: 'f', value: 0 },
		skyTex: { type: 't', value: textureCube },
	},
});

var loader = new THREE.JSONLoader();
loader.load('data/06-sph.json', 
	function(geometry) {
		var material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
		var object = new THREE.Mesh(geometry, carMaterial);
		scene.add(object);
	}
);

new THREE.TextureLoader().load(
	'tex/06_warp_sph/mean.png',
	function(tex) { carMaterial.uniforms.meanTex.value = tex; }
);

new THREE.TextureLoader().load(
	'tex/06_warp_sph/components.png',
	function(tex) { carMaterial.uniforms.componentsTex.value = tex; }
);

// Skybox
var shader = THREE.ShaderLib[ "cube" ];
shader.uniforms[ "tCube" ].value = textureCube;
var material = new THREE.ShaderMaterial({
	fragmentShader: shader.fragmentShader,
	vertexShader: shader.vertexShader,
	uniforms: shader.uniforms,
	depthWrite: false,
	side: THREE.BackSide

});
mesh = new THREE.Mesh( new THREE.BoxGeometry( 100, 100, 100 ), material );
scene.add( mesh );

var light;

light = new THREE.DirectionalLight(0xffffff, 0.3);
light.position.set(-1, 1, 1);
scene.add(light);

light = new THREE.AmbientLight(0xffffff, 0.1);
scene.add(light);

function loadRoadTex(url) {
    var t = THREE.ImageUtils.loadTexture(url);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(100, 100);
    return t;
}

var floorMaterial = new THREE.MeshPhongMaterial({
    color: 0xffffff, specular: 0xffffff,
    map: loadRoadTex('tex/road/Road_0004_diffuse.jpg'),
    specularMap: loadRoadTex('tex/road/Road_0004_specular.jpg'),
});

var floor = new THREE.Mesh(
        new THREE.CircleGeometry(100, 10),
        floorMaterial
);
scene.add(floor);
floor.rotation.x = -0.5 * Math.PI;
floor.position.y -= 0.14;

var recordsByName = { }, records = [];

guiParams.random = function() {
    var idx = Math.floor(records.length * Math.random());
    guiParams.image = records[idx].fn;
}
gui.add(guiParams, 'random');

microAjax('data/components.json', function(res) {
	var d = JSON.parse(res);
        records = d.files;

        var imageFileNames = [];
        guiParams.image = '';
        for(var i=0; i<records.length; ++i) {
            imageFileNames[i] = records[i].fn;
            guiParams.image = records[i].fn;
            recordsByName[records[i].fn] = records[i];
        }
        imageWidget.options(imageFileNames);
});

guiParams.search = function() {
            var bestd = Infinity, bestImg = '';
            for(var i=0; i<records.length; ++i) {
                var d = 0, r = records[i];
                for(var j=0; j<64; ++j) {
                    var a = components['component ' + j] - r.cs[j];
                    d += a*a;
                }
                if(d < bestd) {
                    bestd = d; bestImg = r.fn;
                }
            }
            previewImg.src = bestImg;
};

guiParams.slideshow = false;
gui.add(guiParams, 'slideshow').listen();

function tick() {
    if(guiParams.slideshow) {
        guiParams.random();
    }
    setTimeout(tick, 6000);
}
tick();

var startTime = null, lastTime = null;
function render(time) {
	var deltaTime = 0;

	requestAnimationFrame(render);

	if(!startTime || !time) {
		startTime = time;
		lastTime = time;
	} else {
		deltaTime = time - lastTime;
		lastTime = time;
	}

        var previewImg = document.getElementById('previewImg');
        if(guiParams.image) {
            var r = recordsByName[guiParams.image];
            if(guiParams.loadedImage != guiParams.image) {
                previewImg.src = r ? r.fn : '';
                guiParams.loadedImage = guiParams.image;
                components['mean'] = r.mu;
                for(var i=0; i<64; ++i) { components['component ' + i] = r.cs[i]; }
            }
        }

	carMaterial.uniforms.muWeight.value = components['mean'];
	for(var i=0; i<64; ++i) {
		carMaterial.uniforms.weights.value[i] = components['component ' + i];
	}

	var r = 0.6, speed = 0.66;
	camera.position.x = r * Math.cos(speed * time * 1e-3);
	camera.position.z = r * Math.sin(speed * time * 1e-3);
	camera.position.y = 0.1;
	camera.lookAt(new THREE.Vector3(0, -0.1, 0));

	renderer.render(scene, camera);
}

render();

}

document.addEventListener('DOMContentLoaded', init);
