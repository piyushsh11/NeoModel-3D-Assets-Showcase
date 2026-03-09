use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn step(t: f32) -> f32 {
    (t * 0.8).sin()
}
