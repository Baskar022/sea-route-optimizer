export const interpolateSegment = (start, end, pointsPerSegment = 4) => {
  const result = [];
  for (let i = 0; i <= pointsPerSegment; i += 1) {
    const t = i / pointsPerSegment;
    result.push([
      start[0] + (end[0] - start[0]) * t,
      start[1] + (end[1] - start[1]) * t,
    ]);
  }
  return result;
};

const chaikinPass = (coords) => {
  if (coords.length < 3) return coords;

  const smooth = [coords[0]];
  for (let i = 0; i < coords.length - 1; i += 1) {
    const p0 = coords[i];
    const p1 = coords[i + 1];
    const q = [0.75 * p0[0] + 0.25 * p1[0], 0.75 * p0[1] + 0.25 * p1[1]];
    const r = [0.25 * p0[0] + 0.75 * p1[0], 0.25 * p0[1] + 0.75 * p1[1]];
    smooth.push(q, r);
  }
  smooth.push(coords[coords.length - 1]);
  return smooth;
};

export const smoothRouteCoordinates = (rawCoords, interpolationDensity = 3) => {
  if (!Array.isArray(rawCoords) || rawCoords.length < 2) return rawCoords;

  const interpolated = [];
  rawCoords.forEach((point, index) => {
    if (index === rawCoords.length - 1) return;
    const segment = interpolateSegment(point, rawCoords[index + 1], interpolationDensity);
    if (index > 0) {
      segment.shift();
    }
    interpolated.push(...segment);
  });

  // Two passes gives smoother sea-lane-like curves while preserving endpoints.
  const pass1 = chaikinPass(interpolated);
  const pass2 = chaikinPass(pass1);
  
  // Return smoothed path - validation against land is done by the caller
  return pass2;
};

export const coordsToWaypoints = (coords) =>
  coords.map(([lng, lat], index, all) => ({
    name: index === 0 ? "Start" : index === all.length - 1 ? "Destination" : `WP-${index}`,
    lat,
    lng,
  }));
