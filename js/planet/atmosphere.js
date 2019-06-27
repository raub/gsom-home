'use strict';

window.demo = window.demo || {};

window.demo.atmosphereShader = {
	
	uniforms: {
		iResolution: { value: new THREE.Vector2(1024, 1024) },
		tDiffuse: { value: null },
		tDepth: { value: null },
		cameraNear: { value: 1 },
		cameraFar: { value: 25000 },
	},
	
	vertexShader: `
		varying vec2 vUv;
		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
		}
	`,
	
	fragmentShader: `
		precision highp float;
		uniform vec2 iResolution;
		uniform sampler2D tDiffuse;
		uniform sampler2D tDepth;
		uniform float cameraNear;
		uniform float cameraFar;
		varying vec2 vUv;
		
		#include <packing>
		
		#define PI 3.14159265359
		
		// distance estimator
		float de( in vec3 p ) {
		    return length(p) - 0.5;
		}
		
		
		// approximation of the error function
		float erf( in float x ) {
		    float sign_x = sign(x);
			float t = 1.0/(1.0 + 0.47047*abs(x));
			float result = 1.0 - t*(0.3480242 + t*(-0.0958798 + t*0.7478556))*exp(-(x*x));
			return result * sign_x;
		}
		
		// analytical volumetric fog applied around a sphere
		float getFog( in vec3 start, in vec3 dir, in float dist ) {
		    
		    const float a = 7.000; // fog exponent
			const float b = 1.000; // sphere radius
		    const float c = 500.0; // fog strength
		    
		    float k = start.x;
		    float l = dir.x;
		    float m = start.y;
		    float n = dir.y;
		    float o = start.z;
		    float p = dir.z;
		    float d = dot(start, dir);
		    
		    float res = exp(b-a*(+k*k*(n*n+p*p)
		                         -m*m*(-1.0+n*n)
		                         -o*o*(-1.0+p*p)
		                         -2.0*k*l*o*p
		                         -2.0*m*n*(k*l+o*p) ));
		    res *= erf( sqrt(a)*(d+dist) ) - erf( sqrt(a)*d );
		    res *= (0.5/sqrt(a)) * sqrt(PI) * c;
		    
		    return res;
		    
		}
		float readDepth( sampler2D depthSampler, vec2 coord ) {
			float fragCoordZ = texture2D( depthSampler, coord ).x;
			float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
			return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );
		}
		float getDepth( const in vec2 screenPosition ) {
			// #if DEPTH_PACKING == 1
			// return unpackRGBAToDepth( texture2D( tDepth, screenPosition ) );
			// #else
			return texture2D( tDepth, screenPosition ).x;
			// #endif
		}
		void main() {
		    // float depth = readDepth( tDepth, vUv );
		    float depth = getDepth( vUv );
		    gl_FragColor = vec4(vec3(depth), 1.0);
		    
		 //    vec2 uv = (gl_FragCoord.xy - iResolution.xy * 0.5) / iResolution.y;
			
			// vec3 from = vec3(0, 0, -15.0);
			// vec3 dir = normalize(vec3(uv*0.5, 1.0));
			
		    
			// float totdist = 0.0;
			// for (int steps = 0 ; steps < 300 ; steps++) {
			// 	vec3 p = from + totdist * dir;
		 //        float dist = de(p);
			// 	if (dist < 0.0001)
		 //            break;
		 //        totdist += min(dist*0.2, 1.0);
			// }
		    
		 //    // gl_FragColor = vec4(0.01);
		 //    gl_FragColor = texture2D(tDiffuse, vUv);
		    
		    
		 //    // apply fog
		 //    float d = getFog(from, dir, totdist);
		 //    d = min(0.5, 1.0 - exp(-d));
		    
		 //    gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.5, 0.6, 0.7), d);
		    
		}
	`,
	
};
