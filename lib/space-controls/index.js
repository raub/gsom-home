'use strict';


class SpaceControls {
	
	constructor({
		camera,
		friction = 0.65,
		maxSpeed = 2000,
		power = 5,
		sensitivity = 0.002,
		keys = {
			forward: 87, // W
			back: 83, // S
			left: 65, // A
			right: 68, // D
			up: 32, // Space
			down: 67, // C
			haste: 16, // Shift
		},
		autoEvents = true,
	}) {
		
		this.camera = camera;
		this.friction = friction;
		this.maxSpeed = maxSpeed;
		this.power = power;
		this.sensitivity = sensitivity;
		this.keys = keys;
		
		this._mouseDown = false;
		this._velocity = new THREE.Vector3();
		
		this._keyState = {
			[keys.forward]: 0,
			[keys.back]: 0,
			[keys.left]: 0,
			[keys.right]: 0,
			[keys.up]: 0,
			[keys.down]: 0,
			[keys.haste]: 0,
		};
		
		this._mousemove = this.mousemove.bind(this);
		this._mousedown = this.mousedown.bind(this);
		this._mouseup = this.mouseup.bind(this);
		this._keydown = this.keydown.bind(this);
		this._keyup = this.keyup.bind(this);
		
		if (autoEvents) {
			this.addEvents();
		}
		
	}
	
	
	addEvents() {
		document.addEventListener('mousemove', this._mousemove);
		document.addEventListener('mousedown', this._mousedown);
		document.addEventListener('mouseup', this._mouseup);
		document.addEventListener('keydown', this._keydown);
		document.addEventListener('keyup', this._keyup);
	}
	
	
	removeEvents() {
		document.removeEventListener('mousemove', this._mousemove);
		document.removeEventListener('mousedown', this._mousedown);
		document.removeEventListener('mouseup', this._mouseup);
		document.removeEventListener('keydown', this._keydown);
		document.removeEventListener('keyup', this._keyup);
	}
	
	
	_k(name) {
		return this._keyState[this.keys[name]] || 0;
	}
	
	
	update(delta = 0.017) {
		
		const q = this.camera.quaternion.clone();
		
		const forward = new THREE.Vector3(0, 0, 1);
		forward.applyQuaternion(q);
		const right = new THREE.Vector3(1, 0, 0);
		right.applyQuaternion(q);
		const up = new THREE.Vector3(0, 1, 0);
		up.applyQuaternion(q);
		
		const accel = (
			forward.multiplyScalar(this._k('back') - this._k('forward')).add(
				right.multiplyScalar(this._k('right') - this._k('left')).add(
					up.multiplyScalar(this._k('up') - this._k('down'))
				)
			).multiplyScalar(0.1 * this.power * (1 + 99 * this._k('haste')))
		);
		
		this._velocity.multiplyScalar(this.friction).add(accel).clampLength(0, this.maxSpeed);
		
		this.camera.position.add(this._velocity.clone().multiplyScalar(delta));
		
	}
	
	
	mousemove({ movementX, movementY }) {
		
		if ( ! this._mouseDown ) {
			return;
		}
		
		const up = new THREE.Vector3(0, 1, 0);
		const right = new THREE.Vector3(1, 0, 0);
		
		const qx = (new THREE.Quaternion()).setFromAxisAngle(up, movementX * this.sensitivity);
		const qy = (new THREE.Quaternion()).setFromAxisAngle(right, movementY * this.sensitivity);
		qx.multiply(qy).normalize();
		this.camera.quaternion.multiply(qx).normalize();
		
	}
	
	
	mousedown(event) {
		this._mouseDown = true;
	}
	
	
	mouseup(event) {
		this._mouseDown = false;
	}
	
	
	keydown(event) {
		this._keyState[event.keyCode] = 1;
	}
	
	
	keyup(event) {
		this._keyState[event.keyCode] = 0;
	}
	
}
