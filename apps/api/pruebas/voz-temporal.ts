import { vozSegunCaso } from '../src/services/video.js';
for (const [t, p] of [['Profesional y formal','Emiratos Árabes Unidos'],['Cercano y cálido','Emiratos Árabes Unidos'],['Profesional y formal','Colombia']]) {
  console.log(t, '|', p, '=>', JSON.stringify(vozSegunCaso(t, p)));
}
