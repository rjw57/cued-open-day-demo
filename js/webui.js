var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
var renderer = new THREE.WebGLRenderer();

camera.position.z = 1;

renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

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

var components = { mean: 1 };
componentsGui.add(components, 'mean', 0, 1).listen();
for(var i=0; i<64; ++i) {
	components['component ' + i] = 0.;
	componentsGui.add(components, 'component ' + i, -1, 1).listen();
}

var r = "tex/skybox/";
var urls = [
	r + "px.jpg", r + "nx.jpg",
	r + "py.jpg", r + "ny.jpg",
	r + "pz.jpg", r + "nz.jpg"
];

//var textureCube = THREE.ImageUtils.loadTextureCube( urls );
//textureCube.format = THREE.RGBFormat;

var carMaterial = new THREE.ShaderMaterial({
	fragmentShader:
"varying vec2 vUv;\n" +
"uniform sampler2D meanTex;\n" +
"uniform sampler2D componentsTex;\n" +
"uniform float weights[64];\n" +
"uniform float muWeight;\n" +
// "uniform samplerCube skyTex;" +
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
//		skyTex: { type: 't', value: textureCube },
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
// shader.uniforms[ "tCube" ].value = textureCube;
var material = new THREE.ShaderMaterial({
	fragmentShader: shader.fragmentShader,
	vertexShader: shader.vertexShader,
	uniforms: shader.uniforms,
	depthWrite: false,
	side: THREE.BackSide

});
mesh = new THREE.Mesh( new THREE.BoxGeometry( 100, 100, 100 ), material );
//scene.add( mesh );

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

	carMaterial.uniforms.muWeight.value = components['mean'];
	for(var i=0; i<64; ++i) {
		carMaterial.uniforms.weights.value[i] = components['component ' + i];
	}

	var r = 0.7, speed = 0.66;
	camera.position.x = r * Math.cos(speed * time * 1e-3);
	camera.position.z = r * Math.sin(speed * time * 1e-3);
	camera.position.y = 0.2;
	camera.lookAt( scene.position );

	renderer.render(scene, camera);
}

render();
