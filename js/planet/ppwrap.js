'use strict';


(() => {
	
	const _lerp1 = (a, b, t) => a + (b - a) * t;
	const _lerp = (a, b, t) => a.map((c, i) => _lerp1(c, b[i]));
	const _length = v => Math.sqrt(v.reduce((s, c) => s + c * c, 0));
	const _scale = (v, f) => v.map(c => c * f);
	const _normalize = v => {
		const len = _length(v);
		if (len > 0) {
			return _scale(v, 1 / len);
		}
		return v.slice();
	};
	const _cross = ([ax, ay, az], [bx, by, bz]) => ([
		ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx
	]);
	
	const _dot = (a, b) => a.reduce((s, c, i) => s + c * b[i], 0);
	
	const _add = (a, b) => a.map((c, i) => c + b[i]);
	const _sub = (a, b) => a.map((c, i) => c - b[i]);
	const _abs = a => a.map(c => Math.abs(c));
	const _neg = a => a.map(c => -c);
	const _clamp = (a, min, max) => a.map(c => Math.min(max, Math.max(min, c)));
	const _floor = a => a.map(c => Math.floor(c));
	const _round = a => a.map(c => Math.round(c));
	const _avg = a => a.length ? (a.reduce((s, c) => s + c, 0) / a.length) : 0;
	
	const sampleOffs = [[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]];
	
	let id = 0;
	const collisionDebug = {};
	const sideIds = { x: [0, 1], y: [2, 3], z: [4, 5] };
	const sideRules = [
		{ vBase: 1, vSign: -1, uBase: 0, uSign: 1, uAxis: 2, vAxis: 1 },
		{ vBase: 0, vSign: 1, uBase: 0, uSign: 1, uAxis: 2, vAxis: 1 },
		{ vBase: 1, vSign: -1, uBase: 0, uSign: 1, uAxis: 0, vAxis: 2 },
		{ vBase: 0, vSign: 1, uBase: 0, uSign: 1, uAxis: 0, vAxis: 2 },
		{ vBase: 1, vSign: -1, uBase: 0, uSign: 1, uAxis: 1, vAxis: 0 },
		{ vBase: 0, vSign: 1, uBase: 0, uSign: 1, uAxis: 1, vAxis: 0 },
	];
	
	const ppwrap = ({
		radius: planetRadius,
		height,
		heightmaps,
		gravity = -9.8,
	}) => {
		
		const maxHeight = height * 255;
		
		const collidePlanet = ({ name, pos, radius: size }) => {
			
			name = `${name}-collide`;
			
			// if ( ! collisionDebug[name] ) {
			// 	collisionDebug[name] = new THREE.ArrowHelper(
			// 		new THREE.Vector3(0, 1, 0),
			// 		new THREE.Vector3(pos[0], pos[1], pos[2]),
			// 		3,
			// 		0xffff00
			// 	);
			// 	window.demo.reframe.add(collisionDebug[name]);
			// }
			
			const dist = _length(pos);
			if (dist > (planetRadius + maxHeight + size)) {
				// collisionDebug[name].setColor(new THREE.Color(0xff0000));
				return { point: null, norm: null };
			}
			
			const absPos = _abs(pos);
			
			let axis = 2;
			if (absPos[0] > absPos[1] && absPos[0] > absPos[2]) {
				axis = 0;
			} else if (absPos[1] > absPos[0] && absPos[1] > absPos[2]) {
				axis = 1;
			}
			
			const sideIdx = axis * 2 + (pos[axis] > 0 ? 0 : 1);
			
			const {
				resolution : heightmapRes = 1,
				at         : heightmapAt = 0,
				step       : heightmapStep = 4,
				data       : heightmapData = Uint8Array.from([0]),
			} = heightmaps[sideIdx];
			
			const hmrDivider = 1 / heightmapRes;
			
			const sideRule = sideRules[sideIdx];
			
			const x = (pos[sideRule.uAxis] / pos[axis] + 1) * 0.5;
			const y = (pos[sideRule.vAxis] / pos[axis] + 1) * 0.5;
			const scaledXy = _scale([
				sideRule.uBase + sideRule.uSign * x,
				sideRule.vBase + sideRule.vSign * y,
			], heightmapRes);
			
			const sd = [];
			const samples = sampleOffs.map(duv => {
				const xy = _add(duv, scaledXy);
				const iuv = _clamp(_round(xy), 0, heightmapRes - 1);
				const idx = (iuv[1] * heightmapRes + iuv[0]) * heightmapStep + heightmapAt;
				sd.push(iuv);
				return planetRadius + size + heightmapData[idx] * height;
			});
			
			const xyOffset = _sub(scaledXy, [_avg(sd.map(iuv => iuv[0])), _avg(sd.map(iuv => iuv[1]))]);
			
			const avgX = samples[0] * (0.5 + xyOffset[0]) + samples[1] * (0.5 - xyOffset[0]);
			const avgY = samples[2] * (0.5 + xyOffset[1]) + samples[3] * (0.5 - xyOffset[1]);
			
			const value = (avgX + avgY) * 0.5;
			
			if (dist > value) {
				// collisionDebug[name].setColor(new THREE.Color(0xff0000));
				return { point: null, norm: null };
			}
			
			// NORM
			const iuv = _clamp(_round(_scale([
				sideRule.uBase + sideRule.uSign * x,
				sideRule.vBase + sideRule.vSign * y,
			], heightmapRes)), 0, heightmapRes - 1);
			const idx = (iuv[1] * heightmapRes + iuv[0]) * heightmapStep;
			const norm = [
				-heightmapData[idx],
				-heightmapData[idx + 1],
				-heightmapData[idx + 2],
			];
			
			const point = _scale(_normalize(pos), value);
			
			// collisionDebug[name].setColor(new THREE.Color(0x00ff00));
			// collisionDebug[name].setDirection(new THREE.Vector3(norm[0], norm[1], norm[2]));
			
			// collisionDebug[name].position.set.apply(
			// 	collisionDebug[name].position,
			// 	point
			// );
			
			return { point, norm };
			
		};
		
		const wrappedList = [];
		
		const wrap = ({
			position = [1, 0, 0],
			velocity = [0, 0, 0],
			radius = 10,
			posCb = () => {},
		}) => {
			
			const name = `${id++}`;
			
			// if ( ! collisionDebug[name] ) {
			// 	collisionDebug[name] = new THREE.ArrowHelper(
			// 		new THREE.Vector3(0, 1, 0),
			// 		new THREE.Vector3(0, 1, 0),
			// 		3,
			// 		0xffff00
			// 	);
			// 	window.demo.reframe.add(collisionDebug[name]);
			// }
			
			let pos = position.slice();
			let vel = velocity.slice();
			let onGround = false;
			
			const update = dt => {
				
				pos = _add(pos, _scale(vel, dt));
				// collisionDebug[name].position.set.apply(
				// 	collisionDebug[name].position,
				// 	pos
				// );
				
				const { point, norm } = collidePlanet({ name, pos, radius });
				
				const normPos = _normalize(point || pos);
				const gvec = _scale(normPos, gravity * dt);
				
				
				if (point) {
					onGround = true;
					pos = point;
					
					const nvel = _normalize(vel);
					let planeVec = _normalize(_cross(norm, _cross(_normalize(vel), norm)));
					const grel = Math.abs(_dot(normPos, planeVec));
					vel = _add(vel, _scale(gvec, grel));
					vel = _scale(planeVec, 0.95 * _length(vel));
					// collisionDebug[name].setDirection(new THREE.Vector3(planeVec[0], planeVec[1], planeVec[2]));
				} else {
					vel = _scale(_add(vel, gvec), 0.9999);
					
					onGround = false;
				}
				
				const nvel = _normalize(vel);
				// collisionDebug[name].setColor(new THREE.Color(0x00ffff));
				
				posCb(pos);
				
			};
			
			const wrapped = {
				get velocity() { return vel.slice(); },
				set velocity(v) { vel = v.slice(); },
				get position() { return pos.slice(); },
				set position(v) { pos = v.slice(); },
				get onGround() { return onGround; },
				set onGround(v) { onGround = v; },
				update,
			};
			
			wrappedList.push(wrapped);
			
			return wrapped;
			
		};
		
		const snap = ({
			position = [1, 0, 0],
			radius = 10,
		}) => {
			const name = `${id++}`;
			const pos = _normalize(position);
			const { point, norm } = collidePlanet({ name, pos, radius });
			
			const negnorm = _neg(norm);
			if ( ! collisionDebug[name] ) {
				
				let inten = 2 * (_length(point) - planetRadius) / height;
				
				inten *= inten * inten * inten * inten * inten;
				inten *= 4;
				inten *= inten * inten * inten * inten * inten;
				inten *= 8;
				inten *= inten * inten * inten * inten * inten;
				inten *= 8;
				inten *= inten * inten * inten;
				inten *= 4;
				inten = Math.min(0xFF, Math.floor(0xFF * inten));
				
				collisionDebug[name] = new THREE.ArrowHelper(
					new THREE.Vector3(negnorm[0], negnorm[1], negnorm[2]),
					new THREE.Vector3(point[0], point[1], point[2]),
					3,
					inten << 16
				);
				window.demo.reframe.add(collisionDebug[name]);
			}
			return { point, norm: negnorm };
		};
		
		return {
			snap,
			wrap,
			update: dt => {
				// const startedAt = Date.now();
				wrappedList.forEach(w => w.update(dt));
				// console.log('u', wrappedList.length, Date.now() - startedAt);
			},
		};
		
	};
	
	
	
	if (typeof process !== 'undefined' && typeof module !== 'undefined' && module.exports) {
		module.exports = ppwrap;
	} else {
		window.ppwrap = ppwrap;
	}
	
})();
