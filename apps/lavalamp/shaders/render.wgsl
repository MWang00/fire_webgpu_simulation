

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

  // Map the temperature to color.
  // For instance, we can create a gradient:
  //   - When t is low (near 0), we map it to black.
  //   - As t increases, we mix to red.
  //   - And for higher t, we transition from red to yellow, then to white.
  var color: vec4<f32>;

  // Adjust these thresholds as needed to fit the range of your temperature values.
  if (t < 0.5) {
    // Cold: blend from black to red.
    color = mix(vec4<f32>(0.0, 0.0, 0.0, 1.0), vec4<f32>(1.0, 0.0, 0.0, 1.0), t / 0.5);
  } else if (t < 1.0) {
    // Warmer: blend from red to yellow.
    color = mix(vec4<f32>(1.0, 0.0, 0.0, 1.0), vec4<f32>(1.0, 1.0, 0.0, 1.0), (t - 0.5) / 0.5);
  } else {
    // Hottest: blend from yellow to white.
    // You can clamp the mix factor to ensure it stays within [0, 1].
    let factor = min((t - 1.0) / 0.5, 1.0);
    color = mix(vec4<f32>(1.0, 1.0, 0.0, 1.0), vec4<f32>(1.0, 1.0, 1.0, 1.0), factor);
  }
  return color;
}
