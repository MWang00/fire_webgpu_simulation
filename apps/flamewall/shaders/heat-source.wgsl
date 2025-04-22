/*@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) GlobalInvocationID: vec3<u32>) {
  let index = GlobalInvocationID.x;
  if (index >= arrayLength(&output)) {
    return;
  }

  let simRes = uniforms.simulation_resolution;
  let cellX = f32(index % u32(simRes.x));
  let cellY = f32(index / u32(simRes.x));
  let cellPos = index_to_coord(f32(index));

  let wickPos = vec2<f32>(simRes.x * 0.5, simRes.y * 0.8);
  let dist = distance(cellPos, wickPos);

  let heatRadius = 10.0;
  
  // Read the current simulation data.
  let cell = input[index];
  var updatedCell = cell;
  
  if (dist < heatRadius) {
    let heatFactor = 1.0 - (dist / heatRadius);
    let heatAmount = uniforms.temp_injected * heatFactor * uniforms.delta_time;
    updatedCell.temperature = cell.temperature + heatAmount;
  }
  
  output[index] = updatedCell;
}*/

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) GlobalInvocationID: vec3<u32>) {
  let index = GlobalInvocationID.x;
  if (index >= arrayLength(&output)) {
    return;
  }

  let simRes = uniforms.simulation_resolution;
  let cellX = f32(index % u32(simRes.x));
  let cellY = f32(index / u32(simRes.x));
  let cellPos = vec2<f32>(cellX, cellY); // <- same as index_to_coord

  // Define horizontal wick (line) at a vertical Y position
  let wickY = simRes.y * 0.8;
  let wickThickness = 3.0;

  // Compute distance to wick line (Y-only)
  let distY = abs(cellY - wickY);

  let heatRadius = 10.0;

  let cell = input[index];
  var updatedCell = cell;
  
  if (distY < wickThickness) {
    let heatFactor = 1.0 - (distY / wickThickness);
    let rand = hash2(vec2<u32>(u32(cellX), u32(cellY)));
    let heatAmount = (uniforms.temp_injected + uniforms.temp_injected * rand) * heatFactor * uniforms.delta_time;
    updatedCell.temperature = cell.temperature + heatAmount;
  }

  output[index] = updatedCell;
}

fn hash2(p: vec2<u32>) -> f32 {
  var x = p.x * 374761393u + p.y * 668265263u; // Large primes
  x = (x ^ (x >> 13u)) * 1274126177u;
  return f32(x & 0x7FFFFFFFu) / f32(0x7FFFFFFF); // Normalize to [0,1]
}

