//cuentas.routes.ts
import { CrudService, CrudOptions } from '../../services/crud.service';
import { buildCrudRoutes } from '../shared/crud.routes';

const cuentasService = new CrudService('cuentas_por_cobrar', 'id_cuenta', true);

export default buildCrudRoutes(cuentasService, 'id', {
  resolveScope: (req: any): CrudOptions | undefined => {
    const user = req.user;
    if (user?.id_carrera) {
      return {
        scopeParams: {
          tableField: `(SELECT id_carrera FROM "control financiero".alumnos a WHERE a.matricula = "control financiero".cuentas_por_cobrar.matricula)`,
          idCarrera: user.id_carrera
        }
      };
    }
    return undefined;
  }
});
