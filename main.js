import './styles/style.css'
import * as THREE from 'three'
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const canvas = document.querySelector('.webgl');
const scene = new THREE.Scene();
const gltfLoader = new GLTFLoader()
const sizes = { width: window.innerWidth, height: window.innerHeight }
let blenderCamera = new THREE.PerspectiveCamera(40, sizes.width / sizes.height, 0.1, 1000)
const controls = new OrbitControls(blenderCamera, canvas)

const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true
})

const minPan = new THREE.Vector3( -.1, -.1, -.1 )
const maxPan = new THREE.Vector3( .1, .1, .1 )
const effect = new OutlineEffect( renderer )
let mixer
let clock = new THREE.Clock()

//original shader: https://github.com/craftzdog/ghibli-style-shader
const vertexShader = `
    // Set the precision for data types used in this shader
    precision highp float;
    precision highp int;

    // Variables to pass from vertex to fragment shader
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
        vNormal = normal;
        vPosition = position;

        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
`
const fragmentShader = `
    precision highp float;
    precision highp int;

    // Default THREE.js uniforms available to both fragment and vertex shader
    uniform mat4 modelMatrix;

    uniform vec3 colorMap[4];
    uniform float brightnessThresholds[3];
    uniform vec3 lightPosition;

    // Variables passed from vertex to fragment shader
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
        vec3 worldPosition = ( modelMatrix * vec4( vPosition, 1.0 )).xyz;
        vec3 worldNormal = normalize( vec3( modelMatrix * vec4( vNormal, 0.0 ) ) );
        vec3 lightVector = normalize( lightPosition - worldPosition );
        float brightness = dot( worldNormal, lightVector );

        vec4 final;

        if (brightness > brightnessThresholds[0])
            final = vec4(colorMap[0], 1);
        else if (brightness > brightnessThresholds[1])
            final = vec4(colorMap[1], 1);
        else if (brightness > brightnessThresholds[2])
            final = vec4(colorMap[2], 1);
        else
            final = vec4(colorMap[3], 1);

        gl_FragColor = vec4( final );
    }
`

const getModel = () => {
    gltfLoader.load(
        'anime.glb',
        (gltf) => {
            gltf.scene.traverse( child => {
                if(child.isMesh) {
                    const shaderMaterial = new THREE.ShaderMaterial({
                        uniforms: {
                            colorMap: { value: [] },
                            brightnessThresholds: {
                                value: [0.7, 0.2, 0.0001]
                            },
                            lightPosition: { value: new THREE.Vector3(-15, 15, 10) }
                        },
                        vertexShader,
                        fragmentShader,
                    })

                    shaderMaterial.userData.outlineParameters = {
                        thickness: 0.00085,
                        color: [0, 0, 0],
                        alpha: 1,
                        keepAlive: true,
                        visible: true
                    }
                    
                    shaderMaterial.uniforms.colorMap.value = getMaterials(child.material.name)
                    
                    child.material = shaderMaterial
                    child.castShadow = true
                }
            })

            const animations = gltf.animations
            mixer = new THREE.AnimationMixer(gltf.scene)
            animations.forEach( clip => mixer.clipAction(clip).play())
            scene.add(blenderCamera)
            scene.add(gltf.scene)
            scene.position.set(0, -0.8, 0)
        }
    )
}

const setMaterials = (c01, c02, c03, c04) =>[ new THREE.Color(c04), new THREE.Color(c03), new THREE.Color(c02), new THREE.Color(c01)]

const getMaterials = (name) => {
    const materialColors = {
        '_default': setMaterials("#85c7de", "#aed1e6", "#cfe8ef", "#ffffff", ),
        'Arbol': setMaterials('#3c6153', '#549367', '#78b885', '#9fc679'),
        'Arbol2': setMaterials('#45705F', '#5B9F70', '#82C891', '#B5E28A'),
        'Moto': setMaterials('#0096c7', '#00b4d8', '#48cae4', '#90e0ef'),
        'MotoLlanta': setMaterials('#212529', '#343a40', '#495057', '#6c757d'),
        'MotoAsiento': setMaterials('#ccdbfd', '#d7e3fc', '#e2eafc', '#edf2fb'),
        'MotoMetal': setMaterials('#6c757d', '#adb5bd', '#ced4da', '#ced4da'),
        'Neon': setMaterials('#ffffff', '#ffffff', '#ffffff', '#ffffff'),
        'Frutos': setMaterials('#a53860', '#da627d', '#ffa5ab', '#f9dbbd'),
        'Limite': setMaterials('#6a040f', '#9d0208', '#d00000', '#dc2f02'),
        'Piedra': setMaterials('#7f5539', '#b08968', '#ddb892', '#e6ccb2'),
        'Viento': setMaterials('#ffffff', '#ffffff', '#ffffff', '#ffffff'),
        'Nube': setMaterials('#abc4ff', '#c1d3fe', '#e2eafc', '#edf2fb')
    }

    if (materialColors.hasOwnProperty(name)) return materialColors[name]
    return materialColors['_default']
}

const getRenderer = () => {
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputEncoding = THREE.sRGBEncoding
}

const getCamera = () => {
    blenderCamera.position.x = 0
    blenderCamera.position.y = 1
    blenderCamera.position.z = 4
    scene.add(blenderCamera)
}

const getControls = () => {
    controls.enableDamping = true
    controls.enableZoom = true
    controls.enablePan = true
    controls.minDistance = 4 
    controls.maxDistance = 4.25
    controls.minPolarAngle = Math.PI * .5
    controls.maxPolarAngle = Math.PI * .5
    controls.minAzimuthAngle = - Math.PI * .01
    controls.maxAzimuthAngle = Math.PI * .01
}

const tick = () => {
    requestAnimationFrame(tick)
    let delta = clock.getDelta()
    if ( mixer ) mixer.update( delta )

    controls.update()
    controls.target.clamp( minPan, maxPan )
        
    renderer.render(scene, blenderCamera)
    effect.render(scene, blenderCamera)
}

window.addEventListener('resize', () => {
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    blenderCamera.aspect = sizes.width / sizes.height
    blenderCamera.updateProjectionMatrix()

    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

getModel()
getRenderer()
getCamera()
getControls()
tick()



