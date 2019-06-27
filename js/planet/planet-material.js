'use strict';


class PlanetMaterial extends THREE.ShaderMaterial {
	
	constructor({ diffuse, normalmap, sunPos }) {
		
		const uniforms = {
			...THREE.UniformsLib.shadowmap,
			...THREE.UniformsLib.lights,
			pointLightPosition : {
				type  : 'v3',
				value : sunPos,
			},
			worldInverseTranspose : {
				type  : 'm4',
				value : new THREE.Matrix4(),
			},
			map : {
				type: 't', value: diffuse
			},
			normalmap : {
				type  : 't',
				value : normalmap,
			}
		};
		
		super({
			uniforms       : uniforms,
			vertexShader   : PlanetMaterial.vertexShader,
			fragmentShader : PlanetMaterial.fragmentShader,
			transparent    : false,
			side           : THREE.FrontSide,
			lights         : true,
		});
		
	}
	
}


PlanetMaterial.vertexShader = `
	uniform vec3 pointLightPosition;
	uniform mat4 worldInverseTranspose;
	
	// Attributes
	varying vec3 vPosition;
	varying vec3 vVertex;
	varying vec3 vNormal;
	varying vec2 vUv;
	
	// Lighting
	varying vec3 surfaceToLight;
	varying vec3 surfaceToCamera;
	
	#include <common>
	#include <shadowmap_pars_vertex>
	
	
	void main() {
		
		#include <begin_vertex>
		
		vec4 vPosition4 = modelMatrix * vec4(position, 1.0);
		vPosition = vPosition4.xyz;
		vVertex = position;
		vNormal = mat3(worldInverseTranspose) * normal;
		vUv = uv;
		
		surfaceToLight = pointLightPosition - vPosition;
		surfaceToCamera = cameraPosition - vPosition;
		
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
		
		#include <worldpos_vertex>
		#include <shadowmap_vertex>
		
	}
`;


PlanetMaterial.fragmentShader = `
	#include <common>
	#include <packing>
	
	uniform sampler2D map;
	uniform sampler2D normalmap;
	uniform vec3 pointLightPosition;
	uniform mat4 worldInverseTranspose;
	
	varying vec3 vPosition;
	varying vec3 vVertex;
	varying vec3 vNormal;
	varying vec2 vUv;
	
	varying vec3 surfaceToLight;
	varying vec3 surfaceToCamera;
	
	#include <shadowmap_pars_fragment>
	#include <lights_pars_begin>
	
	vec3 triplanar(sampler2D texture, vec3 vertex, vec3 normal, float scale) {
		vec3 blending = max(abs(normal) - 0.5, 0.0);
		blending /= dot(blending, vec3(1.0));
		
		vec4 xaxis = texture2D(texture, vertex.yz * scale);
		vec4 yaxis = texture2D(texture, vertex.xz * scale);
		vec4 zaxis = texture2D(texture, vertex.xy * scale);
		vec4 color = xaxis * blending.x + yaxis * blending.y + zaxis * blending.z;
		return color.xyz;
	}
	
	
	void main() {
		
		vec3 mapNormal = texture2D(normalmap, vUv).xyz;
		vec3 newNormal = mat3(worldInverseTranspose) * mapNormal;
		
		// Triplanar mapped texture
		vec4 diffColor = vec4(triplanar(map, vVertex, newNormal, 0.1), 1.0);
		
		// float PI = 3.14159265358979323846264;
		vec3 light = normalize(surfaceToLight);
		vec3 cameraDir = normalize(surfaceToCamera);
		float surfDist = min(1.0, length(surfaceToCamera) * 0.0005);
		
		float lightAngle = max((dot(newNormal, light) + 0.5) / 1.8, 0.05);
		
		float viewAngle = max(0.0, dot(vNormal, cameraDir));
		float adjustedLightAngle = min(0.6, lightAngle) / 0.6;
		float adjustedViewAngle = min(0.65, viewAngle) / 0.65;
		float invertedViewAngle = pow(acos(viewAngle), 3.0) * 0.4;
		
		float dProd = 0.0;
		dProd += 0.5 * lightAngle;
		dProd += 0.2 * lightAngle * (invertedViewAngle - 0.1);
		dProd += invertedViewAngle * 0.5 * (max(-0.35, dot(vNormal, light)) + 0.35);
		dProd *= 0.7 + pow(invertedViewAngle/(PI/2.0), 2.0);
		
		dProd *= 0.5;
		vec4 atmColor = vec4(dProd, dProd, dProd * 1.2, 1.0);
		
		IncidentLight directLight;
		DirectionalLight directionalLight;
		float lightValue = 1.0;
		if (NUM_DIR_LIGHTS > 0) {
			directionalLight = directionalLights[0];
			lightValue = getShadow(
				directionalShadowMap[0],
				directionalLight.shadowMapSize,
				directionalLight.shadowBias,
				directionalLight.shadowRadius,
				vDirectionalShadowCoord[0]
			);
		}
		lightValue = lightValue * 0.9 + 0.1;
		float lightFactor = asin(lightAngle);
		lightFactor = min(lightFactor, (lightFactor + lightValue) * 0.5);
		
		vec4 texelColor = diffColor * lightFactor;
		vec4 finalColor = mix(texelColor, atmColor, surfDist * 0.5);
		finalColor.r *= 0.88;
		finalColor.g *= 0.93;
		gl_FragColor = finalColor;
		
	}
`;
