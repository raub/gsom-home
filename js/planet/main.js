'use strict';

window.demo = window.demo || {};

window.demo.init = () => {
	
	const renderer = new THREE.WebGLRenderer({});
	renderer.renderer = renderer;
	// const renderer = new THREE.WebGLDeferredRenderer({});
	// renderer.forwardRendering = false;
	// renderer.enableLightPrePass( true );
	
	window.demo.renderer = renderer;
	
	renderer.renderer.gammaInput = true;
	renderer.renderer.gammaOutput = true;
	renderer.renderer.setClearColor(0x000000, 1);
	renderer.renderer.shadowMap.enabled = true;
	renderer.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.renderer.debug.checkShaderErrors = true;
	
	renderer.domElement.setAttribute('id', 'renderer');
	document.body.appendChild(renderer.domElement);
	
	const scene = new THREE.Scene();
	window.demo.scene = scene;
	
	const context = renderer.renderer.getContext();
	context.getExtension('EXT_shader_texture_lod');
	const ratio = context.drawingBufferWidth / context.drawingBufferHeight;
	
	const camera = new THREE.PerspectiveCamera(60, ratio, 1, 25000);
	camera.position.set(0, 0, 2200);
	window.demo.camera = camera;
	
	const controls = new SpaceControls({ camera/*: window.demo.cameraObj*/ });
	controls.power = 20;
	window.demo.controls = controls;
	
	document.addEventListener('contextmenu', event => event.preventDefault());
	document.addEventListener('wheel', event => event.preventDefault());
	window.addEventListener('resize', () => {
		window.demo.renderer.setSize(window.innerWidth, window.innerHeight);
		window.demo.camera.aspect = window.innerWidth / window.innerHeight;
		window.demo.camera.updateProjectionMatrix();
	});
	
	const sunDist = 2000;
	window.demo.sunLight = new THREE.DirectionalLight(new THREE.Color(0xFFFFFF), 0.5);
	window.demo.sunLight.castShadow = true;
	window.demo.sunLight.shadow.mapSize.width = 2048;
	window.demo.sunLight.shadow.mapSize.height = 2048;
	window.demo.sunLight.shadow.bias = -0.001;
	window.demo.sunLight.shadow.camera.near = 50;
	window.demo.sunLight.shadow.camera.far = 4000;
	window.demo.sunLight.shadow.camera.left = -2000;
	window.demo.sunLight.shadow.camera.right = 2000;
	window.demo.sunLight.shadow.camera.top = -2000;
	window.demo.sunLight.shadow.camera.bottom = 2000;
	window.demo.sunLight.position.set(sunDist, 0, 0);
	
	scene.add(window.demo.sunLight);
	
	const spaceLight = new THREE.AmbientLight(0x010101); // soft white light
	scene.add(spaceLight);
	
	window.demo.sunPosIdx = 1;
	
	const sunGeometry = new THREE.SphereGeometry(300, 24, 24);
	const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFF33 });
	const sunBall = new THREE.Mesh(sunGeometry, sunMaterial);
	window.demo.sunBall = sunBall;
	window.demo.scene.add(sunBall);
	
	const sunPositions = [
		{
			pos: new THREE.Vector3(sunDist, 0, 0),
			dir: new THREE.Vector3(-1, 0, 0),
		},
		{
			pos: new THREE.Vector3(-sunDist, 0, 0),
			dir: new THREE.Vector3(1, 0, 0),
		},
		{
			pos: new THREE.Vector3(0, sunDist, 0),
			dir: new THREE.Vector3(0, -1, 0),
		},
		{
			pos: new THREE.Vector3(0, -sunDist, 0),
			dir: new THREE.Vector3(0, 1, 0),
		},
		{
			pos: new THREE.Vector3(0, 0, sunDist),
			dir: new THREE.Vector3(0, 0, -1),
		},
		{
			pos: new THREE.Vector3(0, 0, -sunDist),
			dir: new THREE.Vector3(0, 0, 1),
		},
	];
	const setSunPos = (idx) => {
		window.demo.sunLight.position.copy(sunPositions[idx].pos);
		sunBall.position.copy(sunPositions[idx].pos).multiplyScalar(10);
	};
	setSunPos(window.demo.sunPosIdx);
	
	
	
	window.demo.reframe = new THREE.Object3D();
	scene.add(window.demo.reframe);
	
	window.demo.planet = new THREE.Object3D();
	window.demo.reframe.add(window.demo.planet);
	window.demo.reframe.add(window.demo.camera);
	
	window.demo.reframe.rotation.x = Math.PI / 6;
	
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
		texture    : Object.keys(window.texgenExamples)[0],
	};
	
	window.demo.rotSpeed = 0;
	
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
			get sunPos() { return window.demo.sunPosIdx; },
			set sunPos(v) {
				window.demo.sunPosIdx = (v > -1) ? Math.floor(v) : 0;
				setSunPos(window.demo.sunPosIdx);
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
			get texture() { return planetOpts.texture; },
			set texture(v) {
				if (planetOpts.texture === v) {
					return;
				}
				planetOpts.texture = v;
				window.demo.generateTexture(planetOpts.texture);
			},
		},
	};
	window.demo.options = options;
	
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
	guiPlanet.add(options.planet, 'rotSpeed', -200, 200, 1).name('Rotation Speed').listen();
	guiPlanet.add(options.planet, 'sunPos', 0, 5, 1).name('Sun Position').listen();
	guiPlanet.add(options.planet, 'thresholds').name('Thresholds').listen();
	guiPlanet.add(
		options.planet,
		'texture',
		Object.keys(window.texgenExamples)
	).name('Texture').listen();
	guiPlanet.open();
	
	window.demo.materials = [0, 1, 2, 3, 4, 5].map(() => new PlanetMaterial({
		diffuse   : null,
		normalmap : null,
		sunPos    : window.demo.sunLight.position,
	}));
	// window.demo.material = new THREE.MeshBasicMaterial({
	// 	color: 0x00ff00,
	// 	wireframe: true,
	// });
	window.demo.generateTexture(planetOpts.texture);
	
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
	
	
	const { add, length, scale, normalize, cross, dot } = v3m;
	
	var loader = new THREE.GLTFLoader();
	
	document.addEventListener('keydown', e => {
		
		if (e.code === 'KeyG') {
			for (let i = -25; i < 25; i++) {
				for (let j = -25; j < 25; j++) {
					window.demo.pp.snap({
						position : [
							-100,
							-100 + i * 0.3,
							100 + j * 0.3,
						],
						radius   : 0.01,
					});
				}
			}
			return;
		}
		
		
		
		if (e.code !== 'KeyF') {
			return;
		}
		
		const RADIUS = 2;
		
		const mesh = new THREE.Object3D();
		window.demo.reframe.add(mesh);
		
		const forward = new THREE.Vector3(0, 0, -1);
		
		const applyPosition = pos => {
			mesh.position.set.apply(mesh.position, pos);
			
			const norm = normalize(pos);
			
			const up = new THREE.Vector3(norm[0], norm[1], norm[2]);
			const nup = new THREE.Vector3(-norm[0], -norm[1], -norm[2]);
			forward.cross(up).cross(nup).normalize();
			
			const m1 = new THREE.Matrix4();
			m1.lookAt(new THREE.Vector3(), forward, up);
			mesh.quaternion.setFromRotationMatrix(m1);
			
		};
		
		applyPosition([camera.position.x, camera.position.y, camera.position.z]);
		forward.set(0, 0, -1);
		forward.applyQuaternion(mesh.quaternion);
		
		loader.load('mdl/base.glb', gltf => {
			gltf.scene.rotation.y = Math.PI;
			gltf.scene.position.y = -RADIUS;
			gltf.scene.traverse(node => {
				if (node instanceof THREE.Mesh) {
					node.castShadow = true;
					node.receiveShadow = true;
				}
			});
			mesh.add(gltf.scene);
		});
		
		
		const wrapped = window.demo.pp.wrap({
			position : [mesh.position.x, mesh.position.y, mesh.position.z],
			radius   : RADIUS,
			posCb    : applyPosition,
		});
		
		document.addEventListener('keydown', e => {
			
			if (e.code === 'KeyI') {
				wrapped.velocity = add(
					wrapped.velocity,
					scale([forward.x,forward.y,forward.z], 10)
				);
			} else if (e.code === 'KeyK') {
				wrapped.velocity = add(
					wrapped.velocity,
					scale([forward.x,forward.y,forward.z], -10)
				);
			} else if (e.code === 'KeyJ') {
				const right = cross(
					[forward.x,forward.y,forward.z],
					normalize([mesh.position.x, mesh.position.y, mesh.position.z])
				);
				wrapped.velocity = add(wrapped.velocity, scale(right, -10));
			} else if (e.code === 'KeyL') {
				const right = cross(
					[forward.x,forward.y,forward.z],
					normalize([mesh.position.x, mesh.position.y, mesh.position.z])
				);
				wrapped.velocity = add(wrapped.velocity, scale(right, 10));
			}
			
		});
		
	});
	
	const images = window.demo.space.map(
		image => {
			const { data, width, height } = image;
			return new ImageData(new Uint8ClampedArray(data), width, height);
		}
	);
	
	const { mapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy } = window.demo.materials[0].uniforms.map.value;
	const texture2 = new THREE.CubeTexture(images);
	texture2.needsUpdate = true;
	scene.background = texture2;
	
	const pixelRatio = renderer.renderer.getPixelRatio();
	
	const composer = new THREE.EffectComposer( renderer.renderer );
	window.addEventListener('resize', () => {
		composer.setSize( window.innerWidth, window.innerHeight );
	});
	
	
	composer.addPass( new THREE.RenderPass( scene, camera ) );
	
	
	const fxaaPass = new THREE.ShaderPass( THREE.FXAAShader );
	fxaaPass.material.uniforms[ 'resolution' ].value.x = 1 / ( window.innerWidth * pixelRatio );
	fxaaPass.material.uniforms[ 'resolution' ].value.y = 1 / ( window.innerHeight * pixelRatio );
	window.addEventListener('resize', () => {
		fxaaPass.material.uniforms[ 'resolution' ].value.x = 1 / ( window.innerWidth * pixelRatio );
		fxaaPass.material.uniforms[ 'resolution' ].value.y = 1 / ( window.innerHeight * pixelRatio );
	});
	composer.addPass( fxaaPass );
	
	const bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight));
	bloomPass.threshold = 0.0;
	bloomPass.strength = 0.3;
	bloomPass.radius = 0.2;
	composer.addPass( bloomPass );
	
	
	const copyPass = new THREE.ShaderPass( THREE.CopyShader );
	copyPass.renderToScreen = true;
	composer.addPass( copyPass );
	window.demo.composer = composer;
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
	
	while (window.demo.planet.children.length > 0) {
		window.demo.planet.remove(window.demo.planet.children[0]);
	}
	
	window.demo.pp = window.ppwrap({
		radius,
		height,
		heightmaps : window.demo.maps.map(m => m.heightmap),
	});
	
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
			surface.castShadow = true;
			surface.receiveShadow = true;
			
			const anchor = new THREE.Object3D();
			anchor.position.set(...center);
			window.demo.planet.add(anchor);
			
			const zero = [0, 0, 0];
			return {
				getChunkPos  : () => center,
				getPlanetPos : () => zero,
				setVisible   : v => { surface.visible = v; },
				getCameraPos : () => {
					const v3 = window.demo.camera.position;
					return [v3.x, v3.y, v3.z];
				},
			};
			
		},
	});
	
	window.demo.update = update;
	
};

window.demo.generateGeometry = window.demo.debounce(200)(window.demo.generateGeometryNow);


window.demo.generateTexture = name => {
	
	const { texture } = THREE.generateTexture({
		renderer : window.demo.renderer,
		fragment : window.texgenExamples[name],
	});
	
	window.demo.materials.forEach((m, i) => {
		if (m.constructor === PlanetMaterial) {
			m.uniforms.map.value = texture;
			// m.uniforms.normalmap.value = window.demo.maps[i].texture;
		}
	});
	
};


window.demo.generateAllNow = (
	{ resolution, seed },
	planetOpts
) => {
	
	window.demo.maps = [0, 1, 2, 3, 4, 5].map(
		index => window.demo.generateMaps({ index, resolution, seed })
	);
	
	window.demo.space = [0, 1, 2, 3, 4, 5].map(
		index => window.demo.generateSpace({ index, resolution, seed })
	);
	
	window.demo.materials.forEach((m, i) => {
		if (m.constructor === PlanetMaterial) {
			// m.uniforms.map.value = texture;
			m.uniforms.normalmap.value = window.demo.maps[i].texture;
		}
	});
	
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
		noconsole : false,
		floating  : true,
		uniforms  : {
			index  : { type: 'i', value: index },
			reses  : { type: 'v2', value: new THREE.Vector2(resolution, reshalf) },
			seed   : {
				type  : 'v3',
				value : new THREE.Vector3(dx, dy, dz).multiplyScalar(0.001)
			},
		},
		fragment : `
			uniform int index;
			uniform vec3 seed;
			uniform vec3 reses;
			
			void main() {
				
				vec2 xy = varUv * (reses.x + 1.0) - (reses.y + 0.5);
				
				float delta = reses.x / 8192.0;
				
				vec3 coordsA;
				vec3 coordsB;
				vec3 coordsC;
				vec3 coordsD;
				
				if (index == 0) {
					coordsA = vec3(reses.y, -xy.y, xy.x - delta);
					coordsB = vec3(reses.y, -xy.y, xy.x + delta);
					coordsC = vec3(reses.y, -xy.y + delta, xy.x);
					coordsD = vec3(reses.y, -xy.y - delta, xy.x);
				} else if (index == 1) {
					coordsA = vec3(-reses.y, -xy.y, -xy.x + delta);
					coordsB = vec3(-reses.y, -xy.y, -xy.x - delta);
					coordsC = vec3(-reses.y, -xy.y + delta, -xy.x);
					coordsD = vec3(-reses.y, -xy.y - delta, -xy.x);
				} else if (index == 2) {
					coordsA = vec3(xy.x, reses.y, -xy.y + delta);
					coordsB = vec3(xy.x, reses.y, -xy.y - delta);
					coordsC = vec3(xy.x + delta, reses.y, -xy.y);
					coordsD = vec3(xy.x - delta, reses.y, -xy.y);
				} else if (index == 3) {
					coordsA = vec3(-xy.x, -reses.y, -xy.y + delta);
					coordsB = vec3(-xy.x, -reses.y, -xy.y - delta);
					coordsC = vec3(-xy.x - delta, -reses.y, -xy.y);
					coordsD = vec3(-xy.x + delta, -reses.y, -xy.y);
				} else if (index == 4) {
					coordsA = vec3(-xy.y + delta, xy.x, reses.y);
					coordsB = vec3(-xy.y - delta, xy.x, reses.y);
					coordsC = vec3(-xy.y, xy.x + delta, reses.y);
					coordsD = vec3(-xy.y, xy.x - delta, reses.y);
				} else if (index == 5) {
					coordsA = vec3(-xy.y + delta, -xy.x, -reses.y);
					coordsB = vec3(-xy.y - delta, -xy.x, -reses.y);
					coordsC = vec3(-xy.y, -xy.x - delta, -reses.y);
					coordsD = vec3(-xy.y, -xy.x + delta, -reses.y);
				}
				
				vec3 sphericalCoordA = normalize(coordsA) * 0.5;
				vec3 sphericalCoordB = normalize(coordsB) * 0.5;
				vec3 sphericalCoordC = normalize(coordsC) * 0.5;
				vec3 sphericalCoordD = normalize(coordsD) * 0.5;
				
				float valueA = noise(sphericalCoordA + seed);
				float valueB = noise(sphericalCoordB + seed);
				float valueC = noise(sphericalCoordC + seed);
				float valueD = noise(sphericalCoordD + seed);
				
				float value = (valueA + valueB + valueC + valueD) * 0.25;
				float val7 = 49.0 * value;
				
				sphericalCoordA *= (valueA + val7) * 0.02;
				sphericalCoordB *= (valueB + val7) * 0.02;
				sphericalCoordC *= (valueC + val7) * 0.02;
				sphericalCoordD *= (valueD + val7) * 0.02;
				
				vec3 bump = normalize(cross(
					normalize(sphericalCoordB - sphericalCoordA),
					normalize(sphericalCoordD - sphericalCoordC)
				));
				
				gl_FragColor = vec4(bump, value);
				
			}
		`,
	});
	
	texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
	
	return {
		heightmap: { data, resolution, at: 3 },
		texture,
	};
	
};



window.demo.generateSpace = ({ index, resolution, seed }) => {
	
	resolution = Math.floor(Math.pow(2, resolution));
	const reshalf = Math.round(resolution * 0.5);
	
	const [dx = 0, dy = 0, dz = 0] = seed.split('-').map(x => parseInt(x, 16));
	
	// NOTE: Uniforms are much FASTER compared to the string-interpolated solution
	const { buffer: data, texture } = THREE.generateTexture({
		resolution,
		noconsole : false,
		floating  : false,
		uniforms  : {
			index  : { type: 'i', value: index },
			reses  : { type: 'v2', value: new THREE.Vector2(resolution, reshalf) },
			seed   : {
				type  : 'v3',
				value : new THREE.Vector3(dx, dy, dz).multiplyScalar(0.001)
			},
		},
		fragment : `
			uniform int index;
			uniform vec3 seed;
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
					coords = vec3(xy.x, -reses.y, xy.y);
				} else if (index == 4) {
					coords = vec3(xy.x, -xy.y, -reses.y);
				} else if (index == 5) {
					coords = vec3(-xy.x, -xy.y, reses.y);
				}
				
				vec3 sphericalCoord = normalize(coords) * 0.5;
				
				float value = noise(sphericalCoord + seed);
				value = value * value;
				
				vec3 uv3 = getUv3(varUv);
				
				vec3 grainColor = texture2D(_grain, varUv * 2.0).xyz;
				grainColor.r *= 0.88;
				grainColor.g *= 0.93;
				
				vec3 mixed = min(vec3(1.0), pow(1.1 * grainColor, vec3(10.0)));
				
				gl_FragColor = vec4(vec3(mixed) * value, 1.0);
				
			}
		`,
	});
	
	return texture.image;
	
};


window.demo.render = () => {
	
	window.demo.stats.begin();
	
	window.demo.time = window.demo.time || Date.now();
	const newTime = Date.now();
	const diff = newTime - window.demo.time;
	const dt = diff * 0.001;
	
	window.demo.controls.update(dt);
	window.demo.update();
	window.demo.pp.update(dt);
	
	window.demo.reframe.rotation.y += diff * 0.000001 * window.demo.rotSpeed;
	window.demo.time = newTime;
	
	const worldInverseTranspose = (
		new THREE.Matrix4()
	).getInverse(window.demo.reframe.matrixWorld).transpose();
	window.demo.materials.forEach(m => {
		if (m.constructor === PlanetMaterial) {
			m.uniforms.worldInverseTranspose.value = worldInverseTranspose;
			m.uniforms.pointLightPosition.value = window.demo.sunLight.position;
		}
	});
	
	// window.demo.renderer.render(window.demo.scene, window.demo.camera);
	window.demo.composer.render();
	window.demo.stats.update();
	
	requestAnimationFrame(window.demo.render);
	
	window.demo.stats.end();
	
};
