export interface Sensors {
  hr?: number;
  cadence?: number;
  power?: number;
}

export interface TrackPoint {
  latitude: number;
  longitude: number;
  elevation: number | null;
  time: Date | null;
  sensors: Sensors;
}
