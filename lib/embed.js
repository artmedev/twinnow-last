// Neural image embedding (CLIP ViT-B/32, quantized). Model is downloaded once into userData/models.
const { app } = require('electron');
const fs = require('fs'), path = require('path');
const ID = 'Xenova/clip-vit-base-patch32';
const modelDir = () => path.join(app.getPath('userData'), 'models');
const isReady = () => fs.existsSync(path.join(modelDir(), ID, 'onnx', 'vision_model_quantized.onnx'));
let model;

// onProgress({ status, file, loaded, total }) from transformers.js while downloading
function load(onProgress) {
  model ||= (async () => {
    const T = await import('@huggingface/transformers');
    T.env.cacheDir = modelDir();
    const o = { progress_callback: onProgress };
    const [proc, vis] = await Promise.all([
      T.AutoProcessor.from_pretrained(ID, o),
      T.CLIPVisionModelWithProjection.from_pretrained(ID, { dtype: 'q8', ...o }),
    ]);
    return { T, proc, vis };
  })();
  model.catch(() => { model = null; });
  return model;
}

// nativeImage -> base64 of L2-normalized Float32 vector
async function embed(img) {
  const { T, proc, vis } = await load();
  const S = 224, b = img.resize({ width: S, height: S, quality: 'good' }).toBitmap(), rgb = new Uint8ClampedArray(S * S * 3);
  for (let i = 0; i < S * S; i++) { rgb[i * 3] = b[i * 4 + 2]; rgb[i * 3 + 1] = b[i * 4 + 1]; rgb[i * 3 + 2] = b[i * 4]; }
  const { image_embeds } = await vis(await proc(new T.RawImage(rgb, S, S, 3)));
  const v = Float32Array.from(image_embeds.data), n = Math.hypot(...v) || 1;
  for (let i = 0; i < v.length; i++) v[i] /= n;
  return Buffer.from(v.buffer).toString('base64');
}

module.exports = { embed, isReady, load };
