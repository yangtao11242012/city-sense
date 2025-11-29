import world from './world2.json';
// 对世界地图的json文件中的经纬度坐标进行处理
const processLng = lng => {
  if (lng > -30) {
    lng = lng - 180;
  } else {
    lng = lng + 180;
  }
  return lng;
};
// 格林兰岛表现怪异
const processLngGe = lng => {
  return lng + 180;
};
const getAve = (arr: number[]) => {
  return (
    arr.reduce((x, cur) => {
      return x + cur;
    }) / arr.length
  );
};
export const worldGeoMapEn = {} as any;
const joinCoords = (xs: number[], ys: number[], coords: number[]) => {
  xs.push(coords[0]);
  ys.push(coords[1]);
};
const insertWorldGeoMap = (name: string, coord: number[]) => {
  if (name == 'United States') {
    coord[0] += 20;
    coord[1] -= 10;
  }
  worldGeoMapEn[name] = coord;
};
world.features.map((district, _index) => {
  // console.log('----district.properties.name: ', district.properties.name)
  const name = district.properties.name;
  const xs = [] as number[];
  const ys = [] as number[];
  if (district.properties.name === 'Greenland') {
    if (district.geometry.type === 'Polygon') {
      district.geometry.coordinates.map(border => {
        border.map(coord => {
          coord[0] = processLngGe(coord[0]);
          joinCoords(xs, ys, coord);
        });
      });
      insertWorldGeoMap(name, [getAve(xs), getAve(ys)]);
    } else {
      district.geometry.coordinates.map(border => {
        border.map(coordinates => {
          coordinates.map(coord => {
            coord[0] = processLngGe(coord[0]);
            joinCoords(xs, ys, coord);
          });
        });
      });
      insertWorldGeoMap(name, [getAve(xs), getAve(ys)]);
    }
  } else {
    if (district.geometry.type === 'Polygon') {
      district.geometry.coordinates.map(border => {
        border.map(coord => {
          coord[0] = processLng(coord[0]);
          joinCoords(xs, ys, coord);
        });
      });
      insertWorldGeoMap(name, [getAve(xs), getAve(ys)]);
    } else {
      district.geometry.coordinates.map(border => {
        border.map(coordinates => {
          coordinates.map(coord => {
            coord[0] = processLng(coord[0]);
            joinCoords(xs, ys, coord);
          });
        });
      });
      insertWorldGeoMap(name, [getAve(xs), getAve(ys)]);
    }
  }
});
export default world;
