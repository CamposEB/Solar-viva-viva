import { onRequestPost as __api_auth_login_js_onRequestPost } from "D:\\projetos\\pages\\Solar-viva\\functions\\api\\auth\\login.js"
import { onRequestPost as __api_auth_logout_js_onRequestPost } from "D:\\projetos\\pages\\Solar-viva\\functions\\api\\auth\\logout.js"
import { onRequestGet as __api_auth_me_js_onRequestGet } from "D:\\projetos\\pages\\Solar-viva\\functions\\api\\auth\\me.js"
import { onRequestDelete as __api_comunicados__id__js_onRequestDelete } from "D:\\projetos\\pages\\Solar-viva\\functions\\api\\comunicados\\[id].js"
import { onRequestPut as __api_comunicados__id__js_onRequestPut } from "D:\\projetos\\pages\\Solar-viva\\functions\\api\\comunicados\\[id].js"
import { onRequestDelete as __api_midia__id__js_onRequestDelete } from "D:\\projetos\\pages\\Solar-viva\\functions\\api\\midia\\[id].js"
import { onRequestDelete as __api_promocoes__id__js_onRequestDelete } from "D:\\projetos\\pages\\Solar-viva\\functions\\api\\promocoes\\[id].js"
import { onRequestPut as __api_promocoes__id__js_onRequestPut } from "D:\\projetos\\pages\\Solar-viva\\functions\\api\\promocoes\\[id].js"
import { onRequestGet as __api_comunicados_index_js_onRequestGet } from "D:\\projetos\\pages\\Solar-viva\\functions\\api\\comunicados\\index.js"
import { onRequestPost as __api_comunicados_index_js_onRequestPost } from "D:\\projetos\\pages\\Solar-viva\\functions\\api\\comunicados\\index.js"
import { onRequestGet as __api_letreiro_js_onRequestGet } from "D:\\projetos\\pages\\Solar-viva\\functions\\api\\letreiro.js"
import { onRequestPut as __api_letreiro_js_onRequestPut } from "D:\\projetos\\pages\\Solar-viva\\functions\\api\\letreiro.js"
import { onRequestGet as __api_midia_index_js_onRequestGet } from "D:\\projetos\\pages\\Solar-viva\\functions\\api\\midia\\index.js"
import { onRequestPost as __api_midia_index_js_onRequestPost } from "D:\\projetos\\pages\\Solar-viva\\functions\\api\\midia\\index.js"
import { onRequestGet as __api_promocoes_index_js_onRequestGet } from "D:\\projetos\\pages\\Solar-viva\\functions\\api\\promocoes\\index.js"
import { onRequestPost as __api_promocoes_index_js_onRequestPost } from "D:\\projetos\\pages\\Solar-viva\\functions\\api\\promocoes\\index.js"
import { onRequestPost as __api_setup_js_onRequestPost } from "D:\\projetos\\pages\\Solar-viva\\functions\\api\\setup.js"
import { onRequestGet as __api_site_js_onRequestGet } from "D:\\projetos\\pages\\Solar-viva\\functions\\api\\site.js"

export const routes = [
    {
      routePath: "/api/auth/login",
      mountPath: "/api/auth",
      method: "POST",
      middlewares: [],
      modules: [__api_auth_login_js_onRequestPost],
    },
  {
      routePath: "/api/auth/logout",
      mountPath: "/api/auth",
      method: "POST",
      middlewares: [],
      modules: [__api_auth_logout_js_onRequestPost],
    },
  {
      routePath: "/api/auth/me",
      mountPath: "/api/auth",
      method: "GET",
      middlewares: [],
      modules: [__api_auth_me_js_onRequestGet],
    },
  {
      routePath: "/api/comunicados/:id",
      mountPath: "/api/comunicados",
      method: "DELETE",
      middlewares: [],
      modules: [__api_comunicados__id__js_onRequestDelete],
    },
  {
      routePath: "/api/comunicados/:id",
      mountPath: "/api/comunicados",
      method: "PUT",
      middlewares: [],
      modules: [__api_comunicados__id__js_onRequestPut],
    },
  {
      routePath: "/api/midia/:id",
      mountPath: "/api/midia",
      method: "DELETE",
      middlewares: [],
      modules: [__api_midia__id__js_onRequestDelete],
    },
  {
      routePath: "/api/promocoes/:id",
      mountPath: "/api/promocoes",
      method: "DELETE",
      middlewares: [],
      modules: [__api_promocoes__id__js_onRequestDelete],
    },
  {
      routePath: "/api/promocoes/:id",
      mountPath: "/api/promocoes",
      method: "PUT",
      middlewares: [],
      modules: [__api_promocoes__id__js_onRequestPut],
    },
  {
      routePath: "/api/comunicados",
      mountPath: "/api/comunicados",
      method: "GET",
      middlewares: [],
      modules: [__api_comunicados_index_js_onRequestGet],
    },
  {
      routePath: "/api/comunicados",
      mountPath: "/api/comunicados",
      method: "POST",
      middlewares: [],
      modules: [__api_comunicados_index_js_onRequestPost],
    },
  {
      routePath: "/api/letreiro",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_letreiro_js_onRequestGet],
    },
  {
      routePath: "/api/letreiro",
      mountPath: "/api",
      method: "PUT",
      middlewares: [],
      modules: [__api_letreiro_js_onRequestPut],
    },
  {
      routePath: "/api/midia",
      mountPath: "/api/midia",
      method: "GET",
      middlewares: [],
      modules: [__api_midia_index_js_onRequestGet],
    },
  {
      routePath: "/api/midia",
      mountPath: "/api/midia",
      method: "POST",
      middlewares: [],
      modules: [__api_midia_index_js_onRequestPost],
    },
  {
      routePath: "/api/promocoes",
      mountPath: "/api/promocoes",
      method: "GET",
      middlewares: [],
      modules: [__api_promocoes_index_js_onRequestGet],
    },
  {
      routePath: "/api/promocoes",
      mountPath: "/api/promocoes",
      method: "POST",
      middlewares: [],
      modules: [__api_promocoes_index_js_onRequestPost],
    },
  {
      routePath: "/api/setup",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_setup_js_onRequestPost],
    },
  {
      routePath: "/api/site",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_site_js_onRequestGet],
    },
  ]