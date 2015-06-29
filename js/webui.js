var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
var renderer = new THREE.WebGLRenderer();

camera.position.z = 1;

renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

var loader = new THREE.JSONLoader();
loader.load('data/06-sph.json', 
	function(geometry) {
		var material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
		var object = new THREE.Mesh(geometry, material);
		scene.add(object);
	}
);

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

	scene.rotation.y += deltaTime * 1e-3 * 0.5;
	renderer.render(scene, camera);
}

scene.rotation.x += 0.1;
render();
