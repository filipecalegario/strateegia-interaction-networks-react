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
