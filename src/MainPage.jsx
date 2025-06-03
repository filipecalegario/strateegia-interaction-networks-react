import { useEffect } from 'react';
import { initializeApp } from './js/main.js';

export default function MainPage() {
  useEffect(() => {
    initializeApp();
  }, []);

  return (
    <div className="container mt-2">
      <div className="row input-group mb-2">
        <h3 id="applet-title"></h3>
      </div>
      <div className="row input-group mb-2" id="project-chooser">
        <span className="col-3 input-group-text">jornada</span>
        <select className="col-6 form-select" id="projects-list"></select>
        <span className="col-3 input-group-text"><a target="_blank" id="project-link" rel="noreferrer">link para jornada</a></span>
      </div>
      <div className="row input-group mb-2" id="mode-chooser">
        <span className="col-3 input-group-text">modo de visualização</span>
        <select className="col-9 form-select" id="modes-list"></select>
      </div>
      <div className="row input-group mb-2" id="color-selector">
        <span className="col-3 input-group-text">tipos de nó</span>
        <div className="col-9 d-flex flex-wrap" id="color-options"></div>
      </div>
      <div id="loading-spinner" className="text-center my-2" style={{display:'none'}}>
        <div className="spinner-border" role="status"></div>
        <div id="loading-message" className="mt-2">carregando...</div>
        <div className="progress mt-2" style={{height:'5px'}}>
          <div id="alpha_value" className="progress-bar" role="progressbar" style={{width:'0%'}} aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
        </div>
      </div>
      <div className="row" id="graph-view" style={{display:'none'}}>
        <svg id="main_svg"></svg>
        <a id="downloadAnchorElem"></a>
        <a id="link_svg"></a>
      </div>
      <div id="legend-container"></div>
      <div className="row" id="beeswarm-view" style={{display:'none'}}>
        <svg id="beeswarm_svg"></svg>
        <a id="downloadAnchorElem"></a>
        <a id="link_svg"></a>
      </div>
    </div>
  );
}
