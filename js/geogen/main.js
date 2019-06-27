'use strict';


window.demo = {};


window.demo.init = function () {
	
	const renderer = new THREE.WebGLRenderer({ antialias: true });
	window.demo.renderer = renderer;
	
	renderer.gammaInput = true;
	renderer.gammaOutput = true;
	renderer.setClearColor(0x000000, 1);
	renderer.setSize(window.innerWidth, window.innerHeight);
	
	renderer.domElement.setAttribute('id', 'renderer');
	document.body.appendChild(renderer.domElement);
	
	const scene = new THREE.Scene();
	window.demo.scene = scene;
	
	const context = renderer.getContext();
	const ratio = context.drawingBufferWidth / context.drawingBufferHeight;
	
	const camera = new THREE.PerspectiveCamera(60, ratio, 0.1, 100000);
	camera.position.set(0, 0, 2200);
	window.demo.camera = camera;
	
	const controls = new SpaceControls({ camera });
	controls.power = 10;
	window.demo.controls = controls;
	
	document.addEventListener('contextmenu', event => event.preventDefault());
	document.addEventListener('wheel', event => event.preventDefault());
	window.addEventListener('resize', function() {
		window.demo.renderer.setSize(window.innerWidth, window.innerHeight);
		window.demo.camera.aspect = window.innerWidth / window.innerHeight;
		window.demo.camera.updateProjectionMatrix();
	});
	
	window.demo.planet = new THREE.Object3D();
	scene.add(window.demo.planet);
	window.demo.planet.rotation.x = Math.PI / 6;
	
	// DAT.GUI
	
	const heightmapOpts = {
		resolution: 10,
		seed: '0000-0000-0000',
	};
	
	const planetOpts = {
		radius     : 800,
		resolution : 16,
		height     : 200,
		thresholds : [1300, 900, 700, 400, 200],
	};
	
	window.demo.rotSpeed = 2;
	window.demo.wireframe = true;
	
	const options = {
		camera: {
			get speed() { return controls.power; },
			set speed(v) { controls.power = v; },
			get sensitivity() { return Math.floor(controls.sensitivity * 10000); },
			set sensitivity(v) { controls.sensitivity = v * 0.0001; },
		},
		heightmap: {
			get resolution() { return heightmapOpts.resolution; },
			set resolution(v) {
				v = Math.floor(v);
				if (heightmapOpts.resolution === v) {
					return;
				}
				heightmapOpts.resolution = v;
				window.demo.generateAll(heightmapOpts, planetOpts);
			},
			get seed() { return heightmapOpts.seed; },
			set seed(v) {
				if (heightmapOpts.seed === v) {
					return;
				}
				heightmapOpts.seed = v;
				window.demo.generateAll(heightmapOpts, planetOpts);
			},
			randomize() {
				this.seed = [0, 0, 0].map(
					() => Math.round(Math.random() * 0xFFFF).toString(16)
				).join('-');
			}
		},
		planet: {
			get rotSpeed() { return window.demo.rotSpeed; },
			set rotSpeed(v) {
				window.demo.rotSpeed = Math.floor(v);
			},
			get wireframe() { return window.demo.wireframe; },
			set wireframe(v) {
				window.demo.wireframe = v;
				window.demo.materials.forEach(m => { m.wireframe = v; });
			},
			get radius() { return planetOpts.radius; },
			set radius(v) {
				if (planetOpts.radius === v) {
					return;
				}
				planetOpts.radius = v;
				window.demo.generateGeometry(planetOpts);
			},
			get resolution() { return planetOpts.resolution; },
			set resolution(v) {
				v = Math.floor(v);
				if (planetOpts.resolution === v) {
					return;
				}
				planetOpts.resolution = v;
				window.demo.generateGeometry(planetOpts);
			},
			get height() { return planetOpts.height; },
			set height(v) {
				if (planetOpts.height === v) {
					return;
				}
				planetOpts.height = v;
				window.demo.generateGeometry(planetOpts);
			},
			get thresholds() { return planetOpts.thresholds.join(','); },
			set thresholds(v) {
				v = v.split(',').map(x => +x);
				if (planetOpts.thresholds === v) {
					return;
				}
				planetOpts.thresholds = v;
				window.demo.generateGeometry(planetOpts);
			},
		},
	};
	
	const gui = new dat.GUI({ hideable: false });
	['mousedown', 'keydown'].forEach(type => {
		gui.domElement.addEventListener(type, e => e.stopPropagation());
	});
	
	const guiCamera = gui.addFolder('Camera');
	guiCamera.add(options.camera, 'sensitivity', -50, 50, 1).name('Sensitivity').listen();
	guiCamera.add(options.camera, 'speed', 1, 20, 1).name('Speed').listen();
	guiCamera.open();
	
	const guiHeightmap = gui.addFolder('Heightmap');
	guiHeightmap.add(options.heightmap, 'resolution', 7, 12, 1).name('Resolution 2^').listen();
	guiHeightmap.add(options.heightmap, 'seed').name('Seed').listen();
	guiHeightmap.add(options.heightmap, 'randomize').name('Randomize').listen();
	guiHeightmap.open();
	
	const guiPlanet = gui.addFolder('Planet');
	guiPlanet.add(options.planet, 'height', 0, 300, 50).name('Height').listen();
	guiPlanet.add(options.planet, 'radius', 200, 2000, 50).name('Radius').listen();
	guiPlanet.add(options.planet, 'resolution', 4, 32, 4).name('Resolution').listen();
	guiPlanet.add(options.planet, 'rotSpeed', -20, 20, 1).name('Rotation Speed').listen();
	guiPlanet.add(options.planet, 'thresholds').name('Thresholds').listen();
	guiPlanet.add(options.planet, 'wireframe').name('Wireframe').listen();
	guiPlanet.open();
	
	window.demo.generateAllNow(heightmapOpts, planetOpts);
	
	window.demo.stats = new Stats();
	window.demo.stats.dom.style.position = 'relative';
	
	const perfFolder = gui.addFolder('Performance');
	const perfLi = document.createElement('li');
	[0, 1].map(i => window.demo.stats.dom.children[i]).forEach(c => {
		c.style.display = 'inline-block';
		perfLi.appendChild(c);
	});
	perfLi.className = 'perf-line';
	perfFolder.__ul.appendChild(perfLi);
	
	window.demo.render();
	
};

window.demo.debounce = dt => cb => {
	let timer = null;
	return function (...args) {
		if (timer) {
			clearTimeout(timer);
		}
		timer = setTimeout(() => {
			cb.apply(this, args);
			timer = null;
		}, dt);
	};
};

window.demo.generateGeometryNow = ({
	radius, intensity, resolution, thresholds, seed, height,
}) => {
	
	height /= 255;
	
	while(window.demo.planet.children.length > 0) {
		window.demo.planet.remove(window.demo.planet.children[0]);
	}
	
	const { update } = window.geogen({
		radius,
		resolution,
		thresholds,
		height,
		heightmaps: window.demo.maps.map(m => m.heightmap),
		onGeometry({ indices, vertices, normals, uvs, index, center }) {
			
			const geometry = new THREE.BufferGeometry();
			
			geometry.addAttribute('position', new THREE.BufferAttribute(vertices, 3));
			geometry.addAttribute('normal', new THREE.BufferAttribute(normals, 3));
			geometry.addAttribute('uv', new THREE.BufferAttribute(uvs, 2));
			
			geometry.setIndex(Array.from(indices));
			
			geometry.dynamic = false;
			geometry.attributes.position.needsUpdate = true;
			geometry.attributes.normal.needsUpdate = true;
			geometry.attributes.uv.needsUpdate = true;
			
			geometry.computeBoundingSphere();
			geometry.computeBoundingBox();
			
			const surface = new THREE.Mesh(geometry, window.demo.materials[index]);
			window.demo.planet.add(surface);
			
			const anchor = new THREE.Object3D();
			anchor.position.set(...center);
			window.demo.planet.add(anchor);
			
			return {
				getChunkPos : () => {
					const v3 = anchor.getWorldPosition(new THREE.Vector3());
					return [v3.x, v3.y, v3.z];
				},
				getPlanetPos : () => {
					const v3 = window.demo.planet.position;
					return [v3.x, v3.y, v3.z];
				},
				getCameraPos : () => {
					const v3 = window.demo.camera.position;
					return [v3.x, v3.y, v3.z];
				},
				setVisible: v => {
					surface.visible = v;
				},
			};
			
		},
	});
	
	window.demo.update = update;
	
};

window.demo.generateGeometry = window.demo.debounce(200)(window.demo.generateGeometryNow);


window.demo.generateAllNow = (
	{ resolution, seed },
	planetOpts
) => {
	
	window.demo.maps = [0, 1, 2, 3, 4, 5].map(
		index => window.demo.generateMaps({ index, resolution, seed })
	);
	
	window.demo.materials = window.demo.maps.map(
		({ texture }, i) => new THREE.MeshBasicMaterial({
			wireframe : window.demo.wireframe,
			color     : 0x00FF00,
			side      : THREE.FrontSide,
			map       : texture,
		})
	);
	
	window.demo.generateGeometryNow(planetOpts);
	
};

window.demo.generateAll = window.demo.debounce(200)(window.demo.generateAllNow);

window.demo.generateMaps = ({ index, resolution, seed }) => {
	
	resolution = Math.floor(Math.pow(2, resolution));
	const reshalf = Math.round(resolution * 0.5);
	
	const [dx = 0, dy = 0, dz = 0] = seed.split('-').map(x => parseInt(x, 16));
	
	// NOTE: Uniforms are much FASTER compared to the string-interpolated solution
	const { buffer: data, texture } = THREE.generateTexture({
		resolution,
		noconsole: false,
		uniforms: {
			index  : { type: 'i', value: index },
			reses  : { type: 'v2', value: new THREE.Vector2(resolution, reshalf) },
			offset : {
				type: 'v3',
				value: new THREE.Vector3(dx, dy, dz).multiplyScalar(0.001)
			},
		},
		renderer : window.demo.renderer,
		fragment: `
			uniform int index;
			uniform vec3 offset;
			uniform vec3 reses;
			void main() {
				vec2 xy = varUv * (reses.x + 1.0) - (reses.y + 0.5);
				vec3 coords;
				if (index == 0) {
					coords = vec3(reses.y, -xy.y, xy.x);
				} else if (index == 1) {
					coords = vec3(-reses.y, -xy.y, -xy.x);
				} else if (index == 2) {
					coords = vec3(xy.x, reses.y, -xy.y);
				} else if (index == 3) {
					coords = vec3(-xy.x, -reses.y, -xy.y);
				} else if (index == 4) {
					coords = vec3(-xy.y, xy.x, reses.y);
				} else if (index == 5) {
					coords = vec3(-xy.y, -xy.x, -reses.y);
				}
				vec3 sphericalCoord = normalize(coords);
				float value = noise(sphericalCoord + offset);
				gl_FragColor = vec4(value, value, value, 1.0);
			}
		`,
	});
	
	texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
	
	return {
		heightmap: { data, resolution },
		texture,
	};
	
};


window.demo.render = function () {
	
	window.demo.stats.begin();
	
	window.demo.time = window.demo.time || Date.now();
	const newTime = Date.now();
	const diff = newTime - window.demo.time;
	
	window.demo.controls.update(diff * 0.001);
	window.demo.update();
	
	window.demo.planet.rotation.y += diff * 0.000001 * window.demo.rotSpeed;
	window.demo.time = newTime;
	
	window.demo.renderer.render(window.demo.scene, window.demo.camera);
	
	window.demo.stats.update();
	
	requestAnimationFrame(window.demo.render);
	
	window.demo.stats.end();
	
};
