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
"varying vec2 vUv;" +
"uniform sampler2D meanTex;" +
// "uniform samplerCube skyTex;" +
"varying vec3 vNormal;" +
"void main(void) {" +
"    vec4 t = texture2D(meanTex, vUv);" +
"    gl_FragColor = t;" +
"}",
	vertexShader:
"varying vec2 vUv;" +
"varying vec3 vNormal;" +
"void main(void) {" +
"    vUv = uv;" +
"    vNormal = (modelViewMatrix * vec4(normal, 0)).xyz;" +
"    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0 );" +
"}",
	side: THREE.DoubleSide,
	uniforms: {
		meanTex: { type: 't' },
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
	//'tex/06_warp_sph/component_0001.png',
	function(tex) {
		carMaterial.uniforms.meanTex.value = tex;
	}
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

	var r = 0.7, speed = 0.66;
	camera.position.x = r * Math.cos(speed * time * 1e-3);
	camera.position.z = r * Math.sin(speed * time * 1e-3);
	camera.position.y = 0.2;
	camera.lookAt( scene.position );

	renderer.render(scene, camera);
}

render();
