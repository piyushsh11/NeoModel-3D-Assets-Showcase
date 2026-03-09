let wasm;

export async function loadWasm(){
  try{
    const mod = await WebAssembly.instantiateStreaming(fetch('/wasm/anim_bg.wasm'), {});
    wasm = mod.instance.exports;
    return wasm;
  }catch(e){
    return null;
  }
}

export function stepAnim(t){
  if (wasm && wasm.step){ return wasm.step(t) }
  return Math.sin(t);
}
