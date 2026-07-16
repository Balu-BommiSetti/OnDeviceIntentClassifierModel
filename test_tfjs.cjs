const tf = require('@tensorflow/tfjs');
async function test() {
  const model = await tf.loadLayersModel('file://public/model/model.json');
  console.log("Model outputs:", model.outputs.map(o => o.name));
  console.log("Model output shapes:", model.outputs.map(o => o.shape));
}
test().catch(console.error);
