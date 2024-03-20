class ComputeY{
    // 数据的逆序 每四个数据为一组的逆序
    // 设置为true时也可以不用该方法。
    // pixels.data, pixels.shape
    // //==== On Firefox, calling it with y-flip causes the warning: "Error: WebGL warning: texImage2D: Alpha-premult and y-flip are deprecated for non-DOM-Element uploads."
            // tex = new THREE.DataTexture(pixels.data,
            //     pixels.shape[0], pixels.shape[1], THREE.RGBAFormat);
            // tex.flipY = true;
            //==== workaround: do manual y-flip
    static createDataFlipY(data, shape) {
        const [w, h, size] = shape;
        const out = new Uint8Array(data.length);
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w * size; x += size) {
                for (let i = 0; i < size; i++) {
                    let out_i = (h-1-y) * w * size + x + i;
                    let in_i = y * w * size + x + i;
                    out[out_i] = data[in_i];
                }
            }
        }
        return out;
    }
}
export default ComputeY;