@compute @workgroup_size(256)
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

  // Read the current simulation data.
  let cell = input[index];
  var updatedCell = cell;
  
  if (dist < uniforms.heat_radius) {
    let heatFactor = 1.0 - (dist / uniforms.heat_radius);
    let heatAmount = uniforms.temp_injected * heatFactor * uniforms.delta_time;
    updatedCell.temperature = cell.temperature + heatAmount;
  }
  
  output[index] = updatedCell;
}
