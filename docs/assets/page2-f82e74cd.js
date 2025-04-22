import{C as I,c as m,H as Y,R as L,s as v,U as O,S as V,P as G,a as s,G as A,p as M,b as U,d as j,e as T}from"./twgl-full.module-f5b32412.js";const i=`struct CellData {
  velocity : vec2<f32>,
  divergence : f32,
  pressure : f32,
  temperature: f32,
}

@group(0) @binding(0) var<storage, read> input : array<CellData>;
@group(0) @binding(1) var<storage, read_write> output : array<CellData>;

struct Uniforms {
  resolution : vec2<f32>,
  simulation_resolution : vec2<f32>,
  delta_time : f32,
  buoyancy: f32,
  viscosity : f32,
  mouse_position : vec2<f32>,
  mouse_delta : vec2<f32>,
  temperature_decay: f32,
  velocity_damping: f32,
  gravity_force: f32,
  noise_strength: f32,
  elapsed_time: f32,
  temp_injected: f32,
}

@group(1) @binding(0) var<uniform> uniforms : Uniforms;`,r=`fn index_to_coord(index: f32) -> vec2<f32> {
  var x = floor(index % uniforms.simulation_resolution.x);
  var y = floor(index / uniforms.simulation_resolution.x);

  return vec2<f32>(x, y);
}

fn coord_to_index(coord: vec2<f32>) -> f32 {
  return (uniforms.simulation_resolution.x) * coord.y + coord.x;
}

fn coord_to_position(coord: vec2<f32>) -> vec2<f32> {
  let scale = uniforms.simulation_resolution / uniforms.resolution;
  return coord / scale;
}

fn position_to_coord(position: vec2<f32>) -> vec2<f32> {
  let scale = uniforms.simulation_resolution / uniforms.resolution;
  return position * scale;
}

fn get_cell_bilinear(grid_position: vec2<f32>) -> CellData {
  var result: CellData; 


  var coord_a = floor(grid_position);
  var coord_b = vec2<f32>(ceil(grid_position.x), floor(grid_position.y));
  var coord_c = ceil(grid_position);
  var coord_d = vec2<f32>(floor(grid_position.x), ceil(grid_position.y));

  let index_a = u32(coord_to_index(coord_a));
  let index_b = u32(coord_to_index(coord_b));
  let index_c = u32(coord_to_index(coord_c));
  let index_d = u32(coord_to_index(coord_d));//originally let index_d = u32(coord_to_index(coord_b));

  let cell_a = input[index_a];
  let cell_b = input[index_b];
  let cell_c = input[index_c];
  let cell_d = input[index_d];

  let u = grid_position.x - coord_a.x;
  let v = grid_position.y - coord_a.y;

  result.velocity = mix(mix(cell_a.velocity, cell_b.velocity, u), mix(cell_d.velocity, cell_c.velocity, u), v);
  result.divergence = mix(mix(cell_a.divergence, cell_b.divergence, u), mix(cell_d.divergence, cell_c.divergence, u), v);
  result.pressure = mix(mix(cell_a.pressure, cell_b.pressure, u), mix(cell_d.pressure, cell_c.pressure, u), v);
  result.temperature = mix(mix(cell_a.temperature, cell_b.temperature, u), mix(cell_d.temperature, cell_c.temperature, u), v);


  return result;
}

fn get_neighboring_position_values(position: vec2<f32>, offset_distance: vec2<f32>) -> array<CellData, 4> {
  var result: array<CellData, 4>;

  let position_up = vec2<f32>(position.x, clamp(position.y - offset_distance.y, 0, uniforms.resolution.y - 1));
  let position_right = vec2<f32>(clamp(position.x + offset_distance.x, 0, uniforms.resolution.x - 1), position.y);
  let position_down = vec2<f32>(position.x, clamp(position.y + offset_distance.y, 0, uniforms.resolution.y - 1));
  let position_left = vec2<f32>(clamp(position.x - offset_distance.x, 0, uniforms.resolution.x - 1), position.y);

  result[0] = get_cell_bilinear(position_to_coord(position_up));
  result[1] = get_cell_bilinear(position_to_coord(position_right));
  result[2] = get_cell_bilinear(position_to_coord(position_down));
  result[3] = get_cell_bilinear(position_to_coord(position_left));

  return result;
}

fn is_boundary(coord: vec2<f32>) -> bool {
  if (coord.x <= 0 || coord.y <= 0 || coord.x >= uniforms.simulation_resolution.x - 1 || coord.y >= uniforms.simulation_resolution.y - 1) {
    return true;
  }
  return false;
}`,X=`@compute @workgroup_size(256, 1, 1)
fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
  let count = arrayLength(&output);
  let index = global_id.x * (global_id.y + 1) * (global_id.z + 1);

  if (index >= count) {
    return;
  }
  
  var current_state = input[index];
  let next_state: ptr<storage, CellData, read_write> = &output[index];
  (*next_state) = current_state;

  let coord = index_to_coord(f32(index));
  if (!is_boundary(coord)) {
    return;
  }

  if (
    (coord.y == 0 && coord.x == 0) ||
    (coord.x == uniforms.simulation_resolution.x -1 && coord.y == 0) ||
    (coord.x == uniforms.simulation_resolution.x -1 && coord.y ==uniforms.simulation_resolution.y -1) ||
    (coord.x == 0 && coord.y == uniforms.simulation_resolution.y -1)
  ) {
    return;
  }

  var normal: vec2<f32>;

  if (coord.y == 0) {
    normal = vec2<f32>(0, 1);
  } else if (coord.y == uniforms.simulation_resolution.y - 1) {
    normal = vec2<f32>(0, -1);
  } else if (coord.x == 0) {
    normal = vec2<f32>(1, 0);
  } else if (coord.x == uniforms.simulation_resolution.x -1) {
    normal = vec2<f32>(-1, 0);
  }

  var inner_coord = coord + normal;
  var inner_index = coord_to_index(inner_coord);
  var inner_data = input[u32(inner_index)];


  (*next_state).velocity = inner_data.velocity * -1;
  (*next_state).pressure = inner_data.pressure;
  (*next_state).divergence = inner_data.divergence;
}`,E=`@compute @workgroup_size(256, 1, 1)
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
}`,q=`@compute @workgroup_size(256, 1, 1)
fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
  let count = arrayLength(&output);
  let index = global_id.x * (global_id.y + 1) * (global_id.z + 1);

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

  let position = coord_to_position(coord);
  let previous_grid_position = position - (*next_state).velocity * uniforms.delta_time;
  let interpolated_cell_data = get_cell_bilinear(position_to_coord(previous_grid_position));
  (*next_state).velocity = interpolated_cell_data.velocity;

}`,B=`@compute @workgroup_size(256, 1, 1)
fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
  let count = arrayLength(&output);
  let index = global_id.x * (global_id.y + 1) * (global_id.z + 1);

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
  let position = coord_to_position(coord);

  let current_velocity = current_state.velocity;
  let scale = uniforms.simulation_resolution / uniforms.resolution;
  var offset_distance = vec2<f32>(2) / scale;
  
  let neighbors = get_neighboring_position_values(position, offset_distance);
  let up = neighbors[0];
  let right = neighbors[1];
  let down = neighbors[2];
  let left = neighbors[3];

  var velocity = 4.0 * current_velocity + uniforms.viscosity * uniforms.delta_time * (up.velocity + right.velocity + down.velocity + left.velocity);
  velocity = velocity / (4 * (1 + uniforms.viscosity * uniforms.delta_time)); 

  (*next_state).velocity = velocity;
}`,H=`@compute @workgroup_size(256, 1, 1)
fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
  let count = arrayLength(&output);
  let index = global_id.x * (global_id.y + 1) * (global_id.z + 1);

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
  let position = coord_to_position(coord);
  
  let scale = uniforms.simulation_resolution / uniforms.resolution;
  var offset_distance = vec2<f32>(1) / scale;

  let neighbors = get_neighboring_position_values(position, offset_distance);
  let up = neighbors[0];
  let right = neighbors[1];
  let down = neighbors[2];
  let left = neighbors[3];
  let divergence = (right.velocity.x - left.velocity.x + down.velocity.y - up.velocity.y) / 2;

  (*next_state).velocity = current_state.velocity;
  (*next_state).divergence = divergence / uniforms.delta_time;
}`,N=`@compute @workgroup_size(256, 1, 1)
fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
  let count = arrayLength(&output);
  let index = global_id.x * (global_id.y + 1) * (global_id.z + 1);

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

  let position = coord_to_position(coord);
  
  let scale = uniforms.simulation_resolution / uniforms.resolution;
  var offset_distance = vec2<f32>(2) / scale;
  let neighbors = get_neighboring_position_values(position, offset_distance);
  let up = neighbors[0];
  let right = neighbors[1];
  let down = neighbors[2];
  let left = neighbors[3];

  (*next_state).divergence = current_state.divergence;
  (*next_state).pressure = (up.pressure + right.pressure + down.pressure + left.pressure) / 4 - current_state.divergence;
}`,W=`@compute @workgroup_size(256, 1, 1)
fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
  let count = arrayLength(&output);
  let index = global_id.x;

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

  let position = coord_to_position(coord);
  
  let scale = uniforms.simulation_resolution / uniforms.resolution;
  var offset_distance = vec2<f32>(1) / scale;

  let neighbors = get_neighboring_position_values(position, offset_distance);
  let up = neighbors[0];
  let right = neighbors[1];
  let down = neighbors[2];
  let left = neighbors[3];

  let grad_pressure = vec2<f32>(right.pressure - left.pressure, down.pressure - up.pressure) * 0.5;

  // ✅ Subtract pressure gradient additively
  (*next_state).velocity -= grad_pressure * uniforms.delta_time;
}
`,K=`

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
`,Z=`/*@compute @workgroup_size(256)
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

`,J=`@compute @workgroup_size(256, 1, 1)
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
`,c=256,y=.25,Q=1,ee=document.querySelector("canvas"),b=new I;let u,l;const h=m(),p=m();let x=!1;const g=m(),_=m();let d,o,w,k,C,R,$,S,D,F,P;const z=()=>{const{delta:e}=b.tick();j(_,_,1-.01*e),d.member.delta_time=Math.max(Math.min(e,33.33),8)/400,d.member.mouse_position=g,d.member.mouse_delta=_,d.elapsed_time=b.elapsedTime,u.run(D),o.step(),u.run(F),o.step(),u.run(w),o.step(),u.run(k),o.step();for(let a=0;a<24;a++)u.run(C),o.step();u.run(R),o.step();for(let a=0;a<24;a++)u.run($),o.step();u.run(S),o.step(),l.render(P),requestAnimationFrame(z)},ne=e=>{if(!x)return;const{clientX:a,clientY:n,movementX:t,movementY:f}=e;_[0]+=t,_[1]+=f,v(g,a*l.pixelRatio,n*l.pixelRatio)},te=()=>x=!0,oe=()=>x=!1,ie=async()=>{const e=await Y.requestWebGPU();u=new T(e),l=new L(e,ee),v(h,l.width,l.height),v(p,Math.round(l.width*y),Math.round(l.height*y)),d=new O(e,{resolution:h,simulation_resolution:p,delta_time:8.33/400,buoyancy:50,viscosity:Q,mouse_position:g,mouse_delta:_,temperature_decay:1,velocity_damping:1,gravity_force:50,noise_strength:10,elapsed_time:0,temp_injected:100});const a=p[0]*p[1],n=new V({velocity:()=>[0,0],divergence:0,pressure:0,temperature:0},a);o=new G(e,n);const t={simulationInput:o,uniforms:d};new s(e,`${i} ${r} ${X}`,t,n.count,c),w=new s(e,`${i} ${r} ${q}`,t,n.count,c),k=new s(e,`${i} ${r} ${E}`,t,n.count,c),C=new s(e,`${i} ${r} ${B}`,t,n.count,c),R=new s(e,`${i} ${r} ${H}`,t,n.count,c),$=new s(e,`${i} ${r} ${N}`,t,n.count,c),S=new s(e,`${i} ${r} ${W}`,t,n.count,c),D=new s(e,`${i} ${r} ${Z}`,t,n.count,c),F=new s(e,`${i} ${r} ${J}`,t,n.count,c);const f=new A(l,M.createPlaneVertices(2,2),1);P=new U(l,`${i} ${r} ${K}`,f,{simulation:o,uniforms:d}),window.addEventListener("mousemove",ne),window.addEventListener("mouseup",oe),window.addEventListener("mousedown",te),requestAnimationFrame(z)};ie();
