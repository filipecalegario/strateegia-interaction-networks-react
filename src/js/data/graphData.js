import * as api from "https://unpkg.com/strateegia-api/strateegia-api.js";
import { NODE_GROUPS, NODE_COLORS, NODE_SIZES } from "../core/config.js";
// import * as d3 from 'https://d3js.org/d3.v6.min.js';

export async function gatherGraphData(accessToken, projectId) {

  const cData = {
    nodes: [],
    links: []
  };

  // const fData = {};

  // let filters = {};

  // if (mode === "usuário") {
  //   filters = {
  //     group: group => ["comment", "reply", "agreement", "users", "user"].includes(group),
  //     // group: group => ["project", "map", "kit", "question", "comment", "reply", "agreement", "users", "user"].includes(group),
  //   };
  // } else if (mode === "projeto") {
  //   filters = {
  //     // group: group => ["comment", "reply", "agreement", "users", "user"].includes(group),
  //     group: group => ["project", "map", "kit", "question", "comment", "reply", "agreement"].includes(group),
  //   };
  // } else if (mode === "indicadores") {
  //   filters = {
  //     group: group => ["project", "map", "kit", "question", "comment", "reply", "agreement", "users", "user"].includes(group),
  //   };
  // }

  function mapColorAndSize(group) {
    // const groups = ["project", "map", "divpoint", "question", "comment", "reply", "agreement", "user", "users"];
    const groups = NODE_GROUPS;
    const colors = NODE_COLORS;
    // const sizes = [10, 9, 8, 7, 6, 4, 3, 7, 9];
    const sizes = NODE_SIZES;
    const color = d3.scaleOrdinal()
      .domain(groups)
      .range(colors);
    const size = d3.scaleOrdinal()
      .domain(groups)
      .range(sizes);
    return { color: color(group), size: size(group) };
  }

  function addNode(id, title, group, createdAt, dashboardUrl) {
    const date = new Date(createdAt)
    const configs = mapColorAndSize(group);
    cData.nodes.push({
      "id": id,
      "title": title,
      "group": group,
      "createdAt": date,
      "dashboardUrl": dashboardUrl,
      "color": configs.color,
      "size": configs.size
    });
  }

  function addLink(source, target) {
    // console.log("addLink %o %o", source, target);
    const targetNode = cData.nodes.find(x => x.id === target);
    if (targetNode !== undefined) {
      targetNode.parentId = source;
    }
    const newLink = {
      "source": source,
      "target": target
    };
    cData.links.push(newLink);
  }

  const project = await api.getProjectById(accessToken, projectId);
  if (project.maps.length > 1) {
    const dashboardUrl = `https://app.strateegia.digital/journey/${projectId}`;
    addNode(projectId, project.title, "project", project.created_at, dashboardUrl);
  }

  addNode("users_forged_id", "Usuários", "users", project.created_at);
  project.users.forEach(user => {
    addNode(user.id, user.name, "user", project.created_at);
    addLink("users_forged_id", user.id);
  });

  const mapRequests = [];
  project.maps.forEach(map => {
    const mapId = map.id;
    mapRequests.push(api.getMapById(accessToken, mapId));
  });

  const mapRequestsResult = await Promise.all(mapRequests);
  const allDivPointRequests = [];
  mapRequestsResult.forEach(map => {
    const mapId = map.id;
    const mapTitle = map.title;
    const mapCreatedAt = map.created_at;
    const mapDashboardUrl = `https://app.strateegia.digital/journey/${projectId}/map/${mapId}`;
    addNode(mapId, mapTitle, "map", mapCreatedAt, mapDashboardUrl);
    if (project.maps.length > 1) {
      addLink(projectId, mapId);
    }
    allDivPointRequests.push(api.getAllDivergencePointsByMapId(accessToken, mapId));
  });

  const allDivPointRequestsResult = await Promise.all(allDivPointRequests);
  const allCommentsRequests = [];
  allDivPointRequestsResult.forEach(mapWithDivPoints => {
    mapWithDivPoints.content.forEach(divPoint => {
      const divPointId = divPoint.id;
      const divPointTitle = divPoint.tool.title;
      const divPointCreatedAt = divPoint.created_at;
      const divPointDashboardUrl = `https://app.strateegia.digital/journey/${projectId}/map/${divPoint.map_id}/point/${divPointId}`;
      addNode(divPointId, divPointTitle, "divpoint", divPointCreatedAt, divPointDashboardUrl);
      addLink(divPoint.map_id, divPointId);
      const questions = divPoint.tool.questions;
      questions.forEach(question => {
        const questionId = question.id;
        const questionIdForGraph = `${divPointId}#${questionId}`;
        const questionText = question.question;
        const questionCreatedAt = divPointCreatedAt;
        const questionDashboardUrl = divPointDashboardUrl;
        addNode(questionIdForGraph, questionText, "question", questionCreatedAt, questionDashboardUrl);
        addLink(divPointId, questionIdForGraph);
      });
      allCommentsRequests.push(api.getCommentsGroupedByQuestionReport(accessToken, divPointId));
    });
  });

  const allCommentsRequestsResult = await Promise.all(allCommentsRequests);
  allCommentsRequestsResult.forEach(report => {
    report.forEach(question => {
      question.comments.forEach(comment => {
        const commentId = comment.id;
        const commentText = comment.text;
        const commentCreatedAt = comment.created_at;
        const commentCreatedBy = comment.created_by;
        const questionIdForGraph = `${comment.divergence_point_id}#${comment.question_id}`;
        addNode(commentId, commentText, "comment", commentCreatedAt, null);
        // if (mode === "projeto") {
        addLink(questionIdForGraph, commentId);
        // } else {
        addLink(commentCreatedBy, commentId); // USER
        // }
        const replies = comment.replies;
        replies.forEach(reply => {
          const replyId = reply.id;
          const replyText = reply.text;
          const replyCreatedAt = reply.created_at;
          const replyCreatedBy = reply.created_by;
          addNode(replyId, replyText, "reply", replyCreatedAt, null);
          // if (mode === "projeto") {
          addLink(commentId, replyId);
          // } else {
          addLink(replyCreatedBy, replyId); // USER
          // }
          reply.agreements.forEach((agreement, index) => {
            const agreementId = `${replyId}#${index}`;
            const agreementText = "OK";
            const agreementCreatedAt = agreement.created_at;
            const agreementCreatedBy = agreement.user_id;
            addNode(agreementId, agreementText, "agreement", agreementCreatedAt, null);
            // if (mode === "projeto") {
            addLink(replyId, agreementId);
            // } else {
            addLink(agreementCreatedBy, agreementId); // USER
            // }
          });
        });
        const agreements = comment.agreements;
        agreements.forEach((agreement, index) => {
          // console.log("about agreement %o", agreement)
          const agreementId = `${commentId}#${index}`;
          const agreementText = "OK";
          const agreementCreatedAt = agreement.created_at;
          const agreementCreatedBy = agreement.user_id;
          addNode(agreementId, agreementText, "agreement", agreementCreatedAt, null);
          // if (mode === "projeto") {
          addLink(commentId, agreementId);
          // } else {
          addLink(agreementCreatedBy, agreementId); // USER
          // }
        });
      });
    });
  });
  console.log(cData);
  return cData;
}
