@compute @workgroup_size(256, 1, 1)
fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
  let count = arrayLength(&output);
  let index = global_id.x;// * (global_id.y + 1) * (global_id.z + 1);

  if (index >= count) {
    return;
  }

  var current_state = input[index];
  let next_state: ptr<storage, CellData, read_write> = &output[index];
  (*next_state) = current_state;

  let coord = index_to_coord(f32(index));
  if (is_boundary(coord)) {
    return;
  }

  let distance_to_mouse = distance(uniforms.mouse_position, coord_to_position(coord));
  var strength = 1 - distance_to_mouse / uniforms.resolution;
 
 //mouse effects
  strength = smoothstep(vec2<f32>(0.95), vec2<f32>(1), strength) * 2.0;
  var velocity = uniforms.mouse_delta * strength * strength;
  
  (*next_state).velocity = (*next_state).velocity + velocity;

  //gravity
  let gravity = vec2<f32>(0.0, uniforms.gravity_force);
  (*next_state).velocity += gravity * uniforms.delta_time;

  //Buoyancy
  let ambient_temperature = 0.0;
  let buoyant_force = uniforms.buoyancy * (current_state.temperature - ambient_temperature);
  (*next_state).velocity.y -= buoyant_force * uniforms.delta_time;

  //air drag
  let damping = uniforms.velocity_damping;
  (*next_state).velocity *= damping;

  //noise (wind etc)
  let pos = coord_to_position(coord);
  let noise = uniforms.noise_strength;

  let flickerx = sin(pos.x * 10.0 + uniforms.elapsed_time * 30.0) * cos(pos.y * 10.0 - uniforms.elapsed_time * 20.0);
  let flicker_strength_x = flickerx * current_state.temperature * 0.1;
  let flickery = sin(pos.y * 20.0 + uniforms.elapsed_time * 20.0) * cos(pos.y * 20.0 - uniforms.elapsed_time * 30.0);
  let flicker_strength_y = flickery * current_state.temperature * 0.1;

  //(*next_state).velocity.x += noise*flicker_strength_x;
  //(*next_state).velocity.y += noise*flicker_strength_y;
}