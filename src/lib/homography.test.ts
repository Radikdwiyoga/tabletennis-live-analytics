import { describe, it, expect } from 'vitest';
import {
  computeHomography,
  invertHomography,
  applyHomography,
  toTable,
  toImage,
  isValidTableQuad,
  calibrateTable,
  TABLE_CORNERS_CM,
  Point2D,
} from './homography';

describe('Homography & Table Calibration', () => {
  // Typical perspective quad from camera looking at table
  const sampleImageCorners: Point2D[] = [
    { x: 120, y: 650 }, // Near-Left
    { x: 1160, y: 640 }, // Near-Right
    { x: 880, y: 220 }, // Far-Right
    { x: 400, y: 230 }, // Far-Left
  ];

  it('validates a proper convex quadrilateral', () => {
    const res = isValidTableQuad(sampleImageCorners);
    expect(res.valid).toBe(true);
  });

  it('rejects collinear points', () => {
    const collinear: Point2D[] = [
      { x: 100, y: 100 },
      { x: 200, y: 200 },
      { x: 300, y: 300 }, // collinear
      { x: 400, y: 100 },
    ];
    const res = isValidTableQuad(collinear);
    expect(res.valid).toBe(false);
    expect(res.reason).toContain('kolinear');
  });

  it('rejects concave or incorrectly ordered points', () => {
    // Concave quadrilateral with one vertex dented inward
    const concave: Point2D[] = [
      { x: 100, y: 100 },
      { x: 500, y: 100 },
      { x: 250, y: 250 }, // dented inwards
      { x: 100, y: 500 },
    ];
    const res = isValidTableQuad(concave);
    expect(res.valid).toBe(false);
    expect(res.reason).toContain('segi empat cembung');
  });

  it('maps the 4 image corners to the 4 table corners with error < 1e-6', () => {
    const H = computeHomography(sampleImageCorners, TABLE_CORNERS_CM);

    for (let i = 0; i < 4; i++) {
      const srcPt = sampleImageCorners[i]!;
      const expectedDst = TABLE_CORNERS_CM[i]!;
      const mapped = applyHomography(H, srcPt);

      expect(Math.abs(mapped.x - expectedDst.x)).toBeLessThan(1e-6);
      expect(Math.abs(mapped.y - expectedDst.y)).toBeLessThan(1e-6);
    }
  });

  it('performs round-trip toImage(toTable(p)) with error < 1e-6', () => {
    const calib = calibrateTable(sampleImageCorners);

    // Test multiple points inside and on the table
    const testImagePoints: Point2D[] = [
      { x: 640, y: 400 }, // near center
      { x: 300, y: 500 },
      { x: 800, y: 450 },
      ...sampleImageCorners,
    ];

    for (const imgPt of testImagePoints) {
      const tablePt = toTable(calib.homography, imgPt);
      const reconstructedImgPt = toImage(calib.invHomography, tablePt);

      expect(Math.abs(reconstructedImgPt.x - imgPt.x)).toBeLessThan(1e-6);
      expect(Math.abs(reconstructedImgPt.y - imgPt.y)).toBeLessThan(1e-6);
    }
  });

  it('inverts homography matrix correctly such that H * H_inv = Identity', () => {
    const H = computeHomography(sampleImageCorners, TABLE_CORNERS_CM);
    const HInv = invertHomography(H);

    // For any test point, applying H then HInv gives original point
    const testPt = { x: 543.21, y: 432.1 };
    const ptTransformed = applyHomography(H, testPt);
    const ptBack = applyHomography(HInv, ptTransformed);

    expect(Math.abs(ptBack.x - testPt.x)).toBeLessThan(1e-6);
    expect(Math.abs(ptBack.y - testPt.y)).toBeLessThan(1e-6);
  });
});
