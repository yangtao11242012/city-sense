import world from './world2.json';

// 对世界地图的json文件中的经纬度坐标进行处理
const processLng = (lng: number): number => {
  if (lng > -30) {
    lng = lng - 180;
  } else {
    lng = lng + 180;
  }
  return lng;
};

// 格林兰岛表现怪异
const processLngGe = (lng: number): number => {
  return lng + 180;
};

const getAve = (arr: number[]): number => {
  return (
    arr.reduce((x, cur) => {
      return x + cur;
    }) / arr.length
  );
};

export const worldGeoMapEn: Record<string, number[]> = {};

const joinCoords = (xs: number[], ys: number[], coords: number[]): void => {
  xs.push(coords[0]);
  ys.push(coords[1]);
};

const insertWorldGeoMap = (name: string, coord: number[]): void => {
  if (name === 'United States') {
    coord[0] += 20;
    coord[1] -= 10;
  }
  worldGeoMapEn[name] = coord;
};

// 类型守卫：检查是否为坐标数组 [number, number]
const isCoordinate = (coord: number | number[] | number[][] | number[][][]): coord is number[] => {
  return Array.isArray(coord) && coord.length >= 2 && typeof coord[0] === 'number' && typeof coord[1] === 'number';
};

world.features.map((district, _index) => {
  // console.log('----district.properties.name: ', district.properties.name)
  const name = district.properties.name;
  const xs: number[] = [];
  const ys: number[] = [];
  
  if (district.properties.name === 'Greenland') {
    if (district.geometry.type === 'Polygon') {
      (district.geometry.coordinates as number[][][]).forEach(border => {
        (border as number[][]).forEach(coord => {
          if (isCoordinate(coord)) {
            coord[0] = processLngGe(coord[0]);
            joinCoords(xs, ys, coord);
          }
        });
      });
      insertWorldGeoMap(name, [getAve(xs), getAve(ys)]);
    } else {
      (district.geometry.coordinates as number[][][][]).forEach(border => {
        (border as number[][][]).forEach(coordinates => {
          (coordinates as number[][]).forEach(coord => {
            if (isCoordinate(coord)) {
              coord[0] = processLngGe(coord[0]);
              joinCoords(xs, ys, coord);
            }
          });
        });
      });
      insertWorldGeoMap(name, [getAve(xs), getAve(ys)]);
    }
  } else {
    if (district.geometry.type === 'Polygon') {
      (district.geometry.coordinates as number[][][]).forEach(border => {
        (border as number[][]).forEach(coord => {
          if (isCoordinate(coord)) {
            coord[0] = processLng(coord[0]);
            joinCoords(xs, ys, coord);
          }
        });
      });
      insertWorldGeoMap(name, [getAve(xs), getAve(ys)]);
    } else {
      (district.geometry.coordinates as number[][][][]).forEach(border => {
        (border as number[][][]).forEach(coordinates => {
          (coordinates as number[][]).forEach(coord => {
            if (isCoordinate(coord)) {
              coord[0] = processLng(coord[0]);
              joinCoords(xs, ys, coord);
            }
          });
        });
      });
      insertWorldGeoMap(name, [getAve(xs), getAve(ys)]);
    }
  }
});

export default world;
