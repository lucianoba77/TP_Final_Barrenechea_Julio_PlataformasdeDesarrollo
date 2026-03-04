import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Badge } from 'react-bootstrap';
import './ProgramacionPersonalizada.css';

const DIAS_SEMANA = [
  { id: 0, nombre: 'Domingo', corto: 'Dom' },
  { id: 1, nombre: 'Lunes', corto: 'Lun' },
  { id: 2, nombre: 'Martes', corto: 'Mar' },
  { id: 3, nombre: 'Miércoles', corto: 'Mié' },
  { id: 4, nombre: 'Jueves', corto: 'Jue' },
  { id: 5, nombre: 'Viernes', corto: 'Vie' },
  { id: 6, nombre: 'Sábado', corto: 'Sáb' }
];

const ProgramacionPersonalizada = ({ 
  programacionPersonalizada, 
  onChange, 
  diasTratamiento,
  esCronico 
}) => {
  const [programacion, setProgramacion] = useState(programacionPersonalizada || {});

  useEffect(() => {
    if (programacionPersonalizada) {
      setProgramacion(programacionPersonalizada);
    } else {
      setProgramacion({});
    }
  }, [programacionPersonalizada]);

  const agregarToma = (diaId) => {
    const nuevoHorario = '09:00';
    const nuevoProgramacion = { ...programacion };
    
    if (!nuevoProgramacion[diaId]) {
      nuevoProgramacion[diaId] = [];
    }
    
    // Validar que no exista ya este horario en el mismo día
    if (nuevoProgramacion[diaId].includes(nuevoHorario)) {
      return; // No agregar si ya existe
    }
    
    nuevoProgramacion[diaId].push(nuevoHorario);
    setProgramacion(nuevoProgramacion);
    onChange(nuevoProgramacion);
  };

  const eliminarToma = (diaId, indice) => {
    const nuevoProgramacion = { ...programacion };
    nuevoProgramacion[diaId] = nuevoProgramacion[diaId].filter((_, i) => i !== indice);
    
    if (nuevoProgramacion[diaId].length === 0) {
      delete nuevoProgramacion[diaId];
    }
    
    setProgramacion(nuevoProgramacion);
    onChange(nuevoProgramacion);
  };

  const actualizarHorario = (diaId, indice, nuevoHorario) => {
    const nuevoProgramacion = { ...programacion };
    
    // Validar que no exista ya este horario en el mismo día (excepto en el índice actual)
    const horariosExistentes = nuevoProgramacion[diaId].filter((_, i) => i !== indice);
    if (horariosExistentes.includes(nuevoHorario)) {
      return; // No actualizar si ya existe otro horario igual en el mismo día
    }
    
    nuevoProgramacion[diaId][indice] = nuevoHorario;
    setProgramacion(nuevoProgramacion);
    onChange(nuevoProgramacion);
  };

  const obtenerTotalTomas = () => {
    return Object.values(programacion).reduce((total, horarios) => total + horarios.length, 0);
  };

  const tieneProgramacion = Object.keys(programacion).length > 0;

  return (
    <Card className="mb-3 programacion-card">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">📅 Personalizar</h5>
        {tieneProgramacion && (
          <Badge bg="primary">{obtenerTotalTomas()} toma(s) programada(s)</Badge>
        )}
      </Card.Header>
      <Card.Body>
        <p className="text-muted small mb-3">
          Selecciona días específicos de la semana y horarios para cada toma. 
          Esta programación reemplazará la programación automática.
        </p>

        <Container fluid>
          {DIAS_SEMANA.map((dia) => {
            const horarios = programacion[dia.id] || [];
            const tieneHorarios = horarios.length > 0;

            return (
              <Row key={dia.id} className="mb-2 dia-row">
                <Col xs={12} sm={3} className="d-flex align-items-center">
                  <Form.Check
                    type="checkbox"
                    id={`dia-${dia.id}`}
                    checked={tieneHorarios}
                    onChange={(e) => {
                      if (e.target.checked) {
                        agregarToma(dia.id);
                      } else {
                        const nuevoProgramacion = { ...programacion };
                        delete nuevoProgramacion[dia.id];
                        setProgramacion(nuevoProgramacion);
                        onChange(nuevoProgramacion);
                      }
                    }}
                    label={<strong>{dia.nombre}</strong>}
                    className="dia-checkbox"
                  />
                </Col>
                <Col xs={12} sm={9}>
                  {tieneHorarios && (
                    <div className="horarios-container">
                      {horarios.map((horario, indice) => (
                        <div key={indice} className="horario-item mb-2">
                          <Form.Control
                            type="time"
                            value={horario}
                            onChange={(e) => actualizarHorario(dia.id, indice, e.target.value)}
                            className="horario-input"
                          />
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => eliminarToma(dia.id, indice)}
                            className="ms-2"
                          >
                            ✕
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => agregarToma(dia.id)}
                        className="mt-1"
                      >
                        + Agregar horario
                      </Button>
                    </div>
                  )}
                </Col>
              </Row>
            );
          })}
        </Container>

        {tieneProgramacion && (
          <div className="mt-3 p-2 bg-light rounded">
            <small className="text-muted">
              <strong>Resumen:</strong> {obtenerTotalTomas()} toma(s) en {Object.keys(programacion).length} día(s) de la semana.
              {esCronico 
                ? ' Esta programación se repetirá semanalmente.'
                : diasTratamiento > 0 
                  ? ` Se repetirá durante ${diasTratamiento} día(s).`
                  : ' Define los días de tratamiento para calcular la duración.'}
            </small>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default ProgramacionPersonalizada;

