import { Point2D, CalibrationResult, calibrateTable } from '@/lib/homography';

const CALIBRATION_STORAGE_KEY = 'tt_table_calibration_v1';

export function saveStoredCalibration(imageCorners: Point2D[]): CalibrationResult | null {
  try {
    const calib = calibrateTable(imageCorners);
    localStorage.setItem(CALIBRATION_STORAGE_KEY, JSON.stringify(imageCorners));
    return calib;
  } catch (err) {
    console.error('Failed to save calibration:', err);
    return null;
  }
}

export function loadStoredCalibration(): CalibrationResult | null {
  try {
    const raw = localStorage.getItem(CALIBRATION_STORAGE_KEY);
    if (!raw) return null;
    const points = JSON.parse(raw) as Point2D[];
    return calibrateTable(points);
  } catch (err) {
    console.warn('Could not load stored calibration:', err);
    return null;
  }
}

export function clearStoredCalibration(): void {
  localStorage.removeItem(CALIBRATION_STORAGE_KEY);
}

