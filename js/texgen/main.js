'use strict';

window.texgen = window.texgen || {};


window.texgen.init = () => {
	
	Object.keys(window.texgenExamples).forEach(k => {
		window.texgenExamples[k] = window.texgenExamples[k].replace(/^\t{1,3}/gm, '');
	});
	
	const renderer = new THREE.WebGLRenderer({ antialias: true });
	
	renderer.debug.checkShaderErrors = true;
	
	window.texgen.renderer = renderer;
	renderer.gammaInput = true;
	renderer.gammaOutput = true;
	renderer.setClearColor(0x000000, 1);
	document.body.appendChild(renderer.domElement);
	const canvas = renderer.domElement;
	
	const context = renderer.getContext();
	const ratio = context.drawingBufferWidth / context.drawingBufferHeight;
	
	const scene = new THREE.Scene();
	window.texgen.scene = scene;
	
	const camera = new THREE.PerspectiveCamera(60, ratio, 0.1, 100000);
	window.texgen.camera = camera;
	camera.position.z = 300;
	camera.lookAt(0, 0, 0);
	
	const controls = new THREE.OrbitControls(camera, renderer.domElement);
	
	controls.minDistance = 50;
	controls.maxDistance = 600;
	controls.enableKeys = false;
	
	const updateSize = () => {
		renderer.setSize(canvas.offsetWidth, canvas.offsetHeight, false);
		camera.aspect = canvas.offsetWidth / canvas.offsetHeight;
		camera.updateProjectionMatrix();
		requestAnimationFrame(window.texgen.render);
	};
	
	window.addEventListener('resize', updateSize);
	updateSize();
	
	const { texture: diffuse } = THREE.generateTexture({
		renderer,
		fragment : window.texgenExamples.stone,
	});
	
	const planes = {};
	
	const geometry = new THREE.PlaneGeometry(100, 100);
	const material = new THREE.MeshBasicMaterial({
		side : THREE.DoubleSide,
		map  : diffuse,
	});
	planes.plane1 = new THREE.Mesh(geometry, material);
	planes.plane2 = new THREE.Mesh(geometry, material);
	planes.plane3 = new THREE.Mesh(geometry, material);
	planes.plane4 = new THREE.Mesh(geometry, material);
	scene.add(planes.plane1);
	scene.add(planes.plane2);
	scene.add(planes.plane3);
	scene.add(planes.plane4);
	
	const positionPlanes = offset => {
		planes.plane1.position.x = -offset;
		planes.plane1.position.y = -offset;
		planes.plane2.position.x = offset;
		planes.plane2.position.y = -offset;
		planes.plane3.position.x = -offset;
		planes.plane3.position.y = offset;
		planes.plane4.position.y = offset;
		planes.plane4.position.x = offset;
	};
	
	positionPlanes(50);
	
	window.texgen.render();
	
	const editor = ace.edit('editor');
	editor.setOptions({
		highlightActiveLine: true,
		highlightSelectedWord: true,
		mergeUndoDeltas: true,
		behavioursEnabled: true,
		wrapBehavioursEnabled: true,
		autoScrollEditorIntoView: true,
		copyWithEmptySelection: false ,
		useSoftTabs: false,
		highlightGutterLine: true,
		animatedScroll: true,
		showInvisibles: false,
		printMargin: 85,
		showFoldWidgets: false,
		showLineNumbers: true,
		showGutter: true,
		displayIndentGuides: true,
		scrollPastEnd: 0.5,
		theme: 'ace/theme/twilight',
		newLineMode: 'unix',
		useSoftTabs: false,
		tabSize: 2,
		wrap: true,
		mode: 'ace/mode/glsl',
		enableBasicAutocompletion: true,
		enableLiveAutocompletion: false,
	});
	
	$('.js-draggable').draggable({
		handle: '.code-toolbar',
		cancel: '.code-toolbar .toolbar-button',
		containment: 'parent',
	});
	
	editor.setValue(window.texgenExamples.stone);
	editor.clearSelection();
	
	let isDarkTheme = true;
	const $themeToggler = $('.js-theme-toggler');
	$themeToggler.on('click', () => {
		isDarkTheme = ! isDarkTheme;
		renderer.setClearColor(isDarkTheme ? 0x000000 : 0xAAAAAA, 1);
		editor.setTheme(`ace/theme/${isDarkTheme ? 'twilight' : 'iplastic'}`);
		$themeToggler.removeClass('light-mode dark-mode');
		$themeToggler.addClass(isDarkTheme ? 'dark-mode' : 'light-mode');
		requestAnimationFrame(window.texgen.render);
	});
	
	let isCellMode = true;
	const $offsetToggler = $('.js-offset-toggler');
	$offsetToggler.on('click', () => {
		isCellMode = ! isCellMode;
		positionPlanes(isCellMode ? 50 : 60);
		$offsetToggler.removeClass('cell-mode grid-mode');
		$offsetToggler.addClass(isCellMode ? 'cell-mode' : 'grid-mode');
		requestAnimationFrame(window.texgen.render);
	});
	
	const $presetToggler = $('.js-preset-toggler');
	const $presetList = $('.js-preset-list');
	$presetToggler.on('click', () => {
		if($presetList.is(':visible')) {
			$presetList.hide();
			return;
		}
		const { left, top } = $presetToggler.offset();
		$presetList.css({
			left: Math.min(left - 10, window.innerWidth - 160),
			top: top + 30,
		});
		$presetList.show();
	});
	
	const $helpToggler = $('.js-help-toggler');
	const $helpList = $('.js-help-window');
	$helpToggler.on('click', () => {
		if($helpList.is(':visible')) {
			$helpList.hide();
			return;
		}
		$helpList.show();
	});
	
	const debounce = dt => cb => {
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
	
	let isEdited = false;
	let prevBuffer = null;
	let prevRes = null;
	const redisplay = debounce(500)(ignoreEdit => {
		ignoreEdit = ignoreEdit || false;
		const fragment = editor.getValue();
		if (fragment.trim().length < 30) {
			return;
		}
		const resolution = 1024;
		const {
			buffer, texture, error
		} = THREE.generateTexture({ renderer, fragment, resolution });
		if (error) {
			const errors = error.split('\n');
			editor.getSession().setAnnotations(
				errors.map(e => e.trim()).filter(
					e => /^ERROR:\s\d+:(\d+): (.*)$/.test(e)
				).map(e => {
					const [, num, text] = e.match(/^ERROR:\s\d+:(\d+): (.*)$/);
					return {
						row: +num - 204, column: 0, text, type: 'error',
					};
				})
			);
			return;
		}
		isEdited = ! ignoreEdit;
		editor.getSession().setAnnotations([]);
		material.map = texture;
		prevBuffer = buffer;
		prevRes = resolution;
		requestAnimationFrame(window.texgen.render);
	});
	redisplay(true);
	
	editor.on('change', redisplay);
	
	let isMousePressed = false;
	
	const $body = $('body');
	
	$body.on('mousedown', e => {
		isMousePressed = true;
		if (e.target.tagName === 'CANVAS') {
			$('.js-ui-overlay').addClass('ui-faded');
		} else {
			$('.js-ui-overlay').removeClass('ui-faded');
		}
	});
	$body.on('mouseup', () => { isMousePressed = false; });
	$body.on('mousemove', () => {
		if (isMousePressed) {
			requestAnimationFrame(window.texgen.render);
		}
	});
	$(renderer.domElement).on('wheel', () => {
		requestAnimationFrame(window.texgen.render);
	});
	
	$('.js-preset-list ul').append(
		Object.keys(window.texgenExamples).map(
			name => [
				'<li class="js-use-preset" data-id="',
				name,
				'">',
				name.replace(/^./, x => x.toUpperCase()),
				'</li>'
			].join('')
		).join('')
	);
	
	$('.js-use-preset').click(function () {
		$presetList.hide();
		if (isEdited &&  ! window.confirm('Discard current code?')) {
			return;
		}
		editor.setValue(window.texgenExamples[$(this).data('id')]);
		redisplay(true);
		editor.clearSelection();
	});
	
	
	$('.js-download-button').click(() => {
		
		const $canvas = $('<canvas>')
			.css({
				position: 'absolute',
				width: `${prevRes}px`,
				height: `${prevRes}px`,
				top: 0,
				left: 0,
			})
			.attr({
				width: prevRes,
				height: prevRes
			});
		
		const ctx = $canvas[0].getContext('2d');
		const imageData = ctx.getImageData(0, 0, prevRes, prevRes);
		imageData.data.set(prevBuffer);
		ctx.putImageData(imageData, 0, 0);
		
		$canvas[0].toBlob(blob => {
			const url = URL.createObjectURL(blob);
			$('<a>').attr('href', url).attr(
				'download',
				`tex-${Date.now().toString(16).slice(-6)}.png`
			)[0].click();
			URL.revokeObjectURL(url);
		});
		
	});
	
	const sideNames = ['float', 'right', 'left'];
	let sideId = 0;
	
	$('.js-side-toggler').click(() => {
		$body.removeClass(`editor-${sideNames[sideId]}`);
		sideId++;
		sideId = sideId % sideNames.length;
		$body.addClass(`editor-${sideNames[sideId]}`);
		updateSize();
		
		if (sideNames[sideId] === 'right') {
			$('.js-ribbon').removeClass('right').addClass('left');
		} else {
			$('.js-ribbon').removeClass('left').addClass('right');
		}
		
		$('.js-code-window').draggable(sideId === 0 ? 'enable' : 'disable');
		$('.js-code-window').attr('style', '');
		editor.resize();
	});
	
};


window.texgen.render = () => {
	
	window.texgen.renderer.render(window.texgen.scene, window.texgen.camera);
	
};
