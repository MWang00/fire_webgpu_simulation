

/*struct VertexInput {
  @location(0) position : vec4<f32>,
  @location(2) texcoord : vec2<f32>,
}

struct VertexOutput {
  @builtin(position) position : vec4<f32>,
  @location(0) texcoord : vec2<f32>,
}
@vertex
fn vertex_main(@builtin(instance_index) instance_index : u32, vert : VertexInput) -> VertexOutput {
  var output : VertexOutput;
  output.position = vec4<f32>(vert.position.x, vert.position.z, 0, 1);
  output.texcoord = vec2<f32>(vert.texcoord.x, 1 - vert.texcoord.y);
  return output;
}

@fragment
fn fragment_main(in: VertexOutput) -> @location(0) vec4<f32> {
  let coord = in.texcoord * uniforms.simulation_resolution;
  let interpolated_cell_data = get_cell_bilinear(coord);

  var scaled_velocity = interpolated_cell_data.velocity * 0.001;
  var velocity_color = vec4<f32>((scaled_velocity.xy + 1) / 2, 1, 1);

  velocity_color = mix(vec4<f32>(0,0,0,1), velocity_color, smoothstep(0, uniforms.resolution.x * 0.2, length(interpolated_cell_data.velocity)));

  // return mix(vec4<f32>(1), color, length(scaled_velocity));
  var scaled_divergence = interpolated_cell_data.divergence * 0.1 * uniforms.delta_time;
  var divergence_color = vec4(scaled_divergence, scaled_divergence,scaled_divergence, 1);

  var scaled_pressure = interpolated_cell_data.divergence * 0.1 * uniforms.delta_time;
  var pressure_color = vec4(scaled_pressure, scaled_pressure, scaled_pressure, 1);
  return velocity_color;
  // return vec4<f32>(uniforms.pose_deltas[0].xy * 0.001, 0, 1);

}*/

struct VertexInput {
  @location(0) position : vec4<f32>,
  @location(2) texcoord : vec2<f32>,
}

struct VertexOutput {
  @builtin(position) position : vec4<f32>,
  @location(0) texcoord : vec2<f32>,
}

@vertex
fn vertex_main(@builtin(instance_index) instance_index : u32, vert : VertexInput) -> VertexOutput {
  var output : VertexOutput;
  output.position = vec4<f32>(vert.position.x, vert.position.z, 0, 1);
  output.texcoord = vec2<f32>(vert.texcoord.x, 1 - vert.texcoord.y);
  return output;
}

@fragment
fn fragment_main(in: VertexOutput) -> @location(0) vec4<f32> {
  // Convert the texture coordinate to a simulation grid coordinate.
  let coord = in.texcoord * uniforms.simulation_resolution;
  
  // Interpolate the cell data at the given coordinate.
  let interpolated_cell_data = get_cell_bilinear(coord);

  // Get the temperature value from the cell.
  let t = interpolated_cell_data.temperature;
  let heatRatio = clamp(t / uniforms.temp_injected, 0.0, 1.0); // Clamp for safety

  var color: vec4<f32>;

  if (heatRatio < 0.002) {
  // Smoke: gray → black
  let tt = heatRatio / 0.002;
  color = mix(vec4<f32>(0.15, 0.15, 0.15, 1.0), vec4<f32>(0.0, 0.0, 0.0, 1.0), tt);

  } else if (heatRatio < 0.005) {
    // Black → red
    let tt = (heatRatio - 0.002) / 0.003;
    color = mix(vec4<f32>(0.0, 0.0, 0.0, 1.0), vec4<f32>(1.0, 0.0, 0.0, 1.0), tt);

  } else if (heatRatio < 0.015) {
    // Red → orange
    let tt = (heatRatio - 0.005) / 0.01;
    color = mix(vec4<f32>(1.0, 0.0, 0.0, 1.0), vec4<f32>(1.0, 0.5, 0.0, 1.0), tt);

  } else if (heatRatio < 0.03) {
    // Orange → yellow
    let tt = (heatRatio - 0.015) / 0.015;
    color = mix(vec4<f32>(1.0, 0.5, 0.0, 1.0), vec4<f32>(1.0, 1.0, 0.0, 1.0), tt);

  } else {
    // Yellow → white
    let tt = min((heatRatio - 0.03) / 0.02, 1.0);
    color = mix(vec4<f32>(1.0, 1.0, 0.0, 1.0), vec4<f32>(1.0, 1.0, 1.0, 1.0), tt);
}

  return color;
}
