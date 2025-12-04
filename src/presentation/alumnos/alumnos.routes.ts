import { CrudService } from '../../services/crud.service';
import { buildCrudRoutes } from '../shared/crud.routes';

// idIsNumber = false porque matricula es texto
const alumnosService = new CrudService('alumnos', 'matricula', false);

export default buildCrudRoutes(alumnosService, 'matricula');
