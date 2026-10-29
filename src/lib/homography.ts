export interface Point2D {
  x: number;
  y: number;
}

export type Matrix3x3 = [
  [number, number, number],
  [number, number, number],
  [number, number, number]
];

/** Standard table tennis table dimensions in centimeters */
export const TABLE_WIDTH_CM = 274.0;
export const TABLE_HEIGHT_CM = 152.5;

/**
 * Standard table corners in cm:
 * Order: 0: Near-Left (0, 0), 1: Near-Right (274, 0), 2: Far-Right (274, 152.5), 3: Far-Left (0, 152.5)
 */
export const TABLE_CORNERS_CM: Point2D[] = [
  { x: 0, y: 0 },
  { x: TABLE_WIDTH_CM, y: 0 },
  { x: TABLE_WIDTH_CM, y: TABLE_HEIGHT_CM },
  { x: 0, y: TABLE_HEIGHT_CM },
];

export interface CalibrationResult {
  imageCorners: Point2D[];
  tableCorners: Point2D[];
  homography: Matrix3x3;
  invHomography: Matrix3x3;
}

/**
 * Validates whether 4 points form a valid, non-collinear, convex quadrilateral with minimum area.
 */
export function isValidTableQuad(
  points: Point2D[],
  minArea: number = 1000
): { valid: boolean; reason?: string } {
  if (points.length !== 4) {
    return { valid: false, reason: 'Harus tepat 4 titik sudut meja.' };
  }

  // Calculate area via Shoelace formula
  let shoelaceSum = 0;
  for (let i = 0; i < 4; i++) {
    const p1 = points[i]!;
    const p2 = points[(i + 1) % 4]!;
    shoelaceSum += p1.x * p2.y - p2.x * p1.y;
  }
  const area = Math.abs(shoelaceSum) / 2;

  if (area < minArea) {
    return { valid: false, reason: 'Area meja terlalu kecil atau titik-titik bertumpuk.' };
  }

  // Check strict convexity: cross products of adjacent edges must maintain the same sign
  let prevSign = 0;
  for (let i = 0; i < 4; i++) {
    const p0 = points[i]!;
    const p1 = points[(i + 1) % 4]!;
    const p2 = points[(i + 2) % 4]!;

    const dx1 = p1.x - p0.x;
    const dy1 = p1.y - p0.y;
    const dx2 = p2.x - p1.x;
    const dy2 = p2.y - p1.y;

    const cross = dx1 * dy2 - dy1 * dx2;
    if (Math.abs(cross) < 1e-6) {
      return { valid: false, reason: 'Ada 3 titik yang berada pada satu garis lurus (kolinear).' };
    }

    const sign = cross > 0 ? 1 : -1;
    if (prevSign === 0) {
      prevSign = sign;
    } else if (prevSign !== sign) {
      return {
        valid: false,
        reason: 'Titik tidak membentuk segi empat cembung atau urutan tap tidak sesuai.',
      };
    }
  }

  return { valid: true };
}

/**
 * Solves an 8x8 linear system A * x = b via Gaussian Elimination with partial pivoting.
 */
function solveLinearSystem8x8(A: number[][], b: number[]): number[] {
  const n = 8;
  const M: number[][] = A.map((row, i) => [...row, b[i]!]);

  for (let col = 0; col < n; col++) {
    // Find pivot
    let maxRow = col;
    let maxVal = Math.abs(M[col]![col]!);
    for (let row = col + 1; row < n; row++) {
      const val = Math.abs(M[row]![col]!);
      if (val > maxVal) {
        maxVal = val;
        maxRow = row;
      }
    }

    if (maxVal < 1e-12) {
      throw new Error('Matriks singular: konfigurasi titik tidak dapat dihitung homografinya.');
    }

    // Swap rows
    if (maxRow !== col) {
      const temp = M[col]!;
      M[col] = M[maxRow]!;
      M[maxRow] = temp;
    }

    // Eliminate below
    for (let row = col + 1; row < n; row++) {
      const targetRow = M[row]!;
      const pivotRow = M[col]!;
      const factor = (targetRow[col] ?? 0) / (pivotRow[col] ?? 1);
      targetRow[col] = 0;
      for (let j = col + 1; j <= n; j++) {
        targetRow[j] = (targetRow[j] ?? 0) - factor * (pivotRow[j] ?? 0);
      }
    }
  }

  // Back substitution
  const x = new Array<number>(n).fill(0);
  for (let row = n - 1; row >= 0; row--) {
    let sum = M[row]![n]!;
    for (let j = row + 1; j < n; j++) {
      sum -= M[row]![j]! * x[j]!;
    }
    x[row] = sum / M[row]![row]!;
  }

  return x;
}

/**
 * Computes the 3x3 Homography matrix mapping points in `src` to `dst` using DLT.
 */
export function computeHomography(src: Point2D[], dst: Point2D[]): Matrix3x3 {
  if (src.length !== 4 || dst.length !== 4) {
    throw new Error('Homography membutuhkan tepat 4 pasang titik.');
  }

  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i]!;
    const { x: u, y: v } = dst[i]!;

    // Row 2*i:   x h11 + y h12 + h13 - u*x h31 - u*y h32 = u
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);

    // Row 2*i+1: x h21 + y h22 + h23 - v*x h31 - v*y h32 = v
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }

  const h = solveLinearSystem8x8(A, b);

  return [
    [h[0]!, h[1]!, h[2]!],
    [h[3]!, h[4]!, h[5]!],
    [h[6]!, h[7]!, 1.0],
  ];
}

/**
 * Inverts a 3x3 matrix using adjugate matrix divided by determinant.
 */
export function invertHomography(H: Matrix3x3): Matrix3x3 {
  const m00 = H[0][0], m01 = H[0][1], m02 = H[0][2];
  const m10 = H[1][0], m11 = H[1][1], m12 = H[1][2];
  const m20 = H[2][0], m21 = H[2][1], m22 = H[2][2];

  const c00 = m11 * m22 - m12 * m21;
  const c01 = -(m10 * m22 - m12 * m20);
  const c02 = m10 * m21 - m11 * m20;

  const det = m00 * c00 + m01 * c01 + m02 * c02;

  if (Math.abs(det) < 1e-12) {
    throw new Error('Matriks singular: tidak dapat dibalik.');
  }

  const invDet = 1.0 / det;

  const c10 = -(m01 * m22 - m02 * m21);
  const c11 = m00 * m22 - m02 * m20;
  const c12 = -(m00 * m21 - m01 * m20);

  const c20 = m01 * m12 - m02 * m11;
  const c21 = -(m00 * m12 - m02 * m10);
  const c22 = m00 * m11 - m01 * m10;

  return [
    [c00 * invDet, c10 * invDet, c20 * invDet],
    [c01 * invDet, c11 * invDet, c21 * invDet],
    [c02 * invDet, c12 * invDet, c22 * invDet],
  ];
}

/**
 * Projects a 2D point using homography matrix H.
 */
export function applyHomography(H: Matrix3x3, p: Point2D): Point2D {
  const x = H[0][0] * p.x + H[0][1] * p.y + H[0][2];
  const y = H[1][0] * p.x + H[1][1] * p.y + H[1][2];
  const w = H[2][0] * p.x + H[2][1] * p.y + H[2][2];

  if (Math.abs(w) < 1e-12) {
    return { x, y };
  }

  return {
    x: x / w,
    y: y / w,
  };
}

/**
 * Maps image coordinate (px) to table coordinate (cm).
 */
export function toTable(H: Matrix3x3, p: Point2D): Point2D {
  return applyHomography(H, p);
}

/**
 * Maps table coordinate (cm) to image coordinate (px).
 */
export function toImage(HInv: Matrix3x3, p: Point2D): Point2D {
  return applyHomography(HInv, p);
}

/**
 * Full table calibration helper from 4 tapped image points.
 */
export function calibrateTable(imageCorners: Point2D[]): CalibrationResult {
  const validation = isValidTableQuad(imageCorners);
  if (!validation.valid) {
    throw new Error(validation.reason || 'Koordinat meja tidak valid.');
  }

  const homography = computeHomography(imageCorners, TABLE_CORNERS_CM);
  const invHomography = invertHomography(homography);

  return {
    imageCorners,
    tableCorners: TABLE_CORNERS_CM,
    homography,
    invHomography,
  };
}
