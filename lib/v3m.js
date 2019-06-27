'use strict';


(() => {
	
	const lerp1 = (a, b, t) => a + (b - a) * t;
	
	const lerp = ([ax, ay, az], [bx, by, bz], t) => [
		lerp1(ax, bx, t),
		lerp1(ay, by, t),
		lerp1(az, bz, t),
	];
	
	const length = ([x, y, z]) => Math.sqrt(x * x + y * y + z * z);
	
	const scale = ([x, y, z], f) => [x * f, y * f, z * f];
	
	const normalize = v => {
		const len = length(v);
		if (len > 0) {
			return scale(v, 1 / len);
		}
		return [v[0], v[1], v[2]];
	};
	
	const cross = ([ax, ay, az], [bx, by, bz]) => ([
		ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx
	]);
	
	const dot = ([ax, ay, az], [bx, by, bz]) => ax * bx + ay * by + az * bz;
	
	const add = ([ax, ay, az], [bx, by, bz]) => [ax + bx, ay + by, az + bz];
	
	const sub = ([ax, ay, az], [bx, by, bz]) => [ax - bx, ay - by, az - bz];
	
	const v3m = {
		lerp1,
		lerp,
		length,
		scale,
		normalize,
		cross,
		dot,
		add,
		sub,
	};
	
	if (typeof process !== 'undefined' && typeof module !== 'undefined' && module.exports) {
		module.exports = v3m;
	} else {
		window.v3m = v3m;
	}
	
})();
