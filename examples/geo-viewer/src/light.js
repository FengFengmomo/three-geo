import * as THREE from 'three';

class Light{
    constructor(x=0,y=0,z=0){
        this.ambient = new THREE.HemisphereLight( 0xffffff, 0xffffff, 1.5 );
        this.spotLight = new THREE.SpotLight( 0xffffff );
        this.spotLight.castShadow = true;
        this.spotLight.up.set( 0, 0, 1 ); // 沿着z轴正方向
    }
    // 目前来看没效果 ,不要使用
    update(x=0,y=0,z=0){
        this.spotLight.position.set( x, y, z );
    }
    getSpotLight(){
        return this.spotLight;
    }
    setcolor(color){
        this.spotLight.color = color;
    }
    getcolor(){
        return this.spotLight.color;
    }
    // 设置目标点
    setTarget(target){
        this.spotLight.target = target;
    }
    getAmbientLight(){
        return this.ambient;
    }
}

export default Light;