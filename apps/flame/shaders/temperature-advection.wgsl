@compute @workgroup_size(256, 1, 1)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let count = arrayLength(&output);
  let index = global_id.x;
  if (index >= count) {
    return;
  }

  // Get current state and initialize next state
  var currentCell = input[index];
  var newCell = currentCell;

  // Compute 2D grid coordinate
  let coord = index_to_coord(f32(index));

  // Skip boundary cells
  if (is_boundary(coord)) {
    return;
  }

  // Convert grid coord to world-space position
  let position = coord_to_position(coord);

  // Backtrace using velocity
  let previous_position = position - currentCell.velocity * uniforms.delta_time;

  // Convert back to grid-space coordinate for sampling
  let previous_coord = position_to_coord(previous_position);

  // Sample interpolated cell data at backtraced location
  let sampled = get_cell_bilinear(previous_coord);

  // Update temperature with advected value
  newCell.temperature = sampled.temperature;

  //temperature decay
  newCell.temperature *= exp(-uniforms.temperature_decay * uniforms.delta_time);

  // Store result
  output[index] = newCell;
}
