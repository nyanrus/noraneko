/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { createEffect, createSignal, For, Show } from "solid-js";
import { render } from "@nora/solid-xul";
import { ShareModal } from "@core/utils/modal";
import type { Panel } from "./utils/type";
import modalStyle from "./modal-style.css?inline";
import { getFirefoxSidebarPanels } from "./extension-panels";
import { STATIC_PANEL_DATA } from "./static-panels";

const { ContextualIdentityService } = ChromeUtils.importESModule(
  "resource://gre/modules/ContextualIdentityService.sys.mjs",
);

type Container = {
  name: string;
  userContextId: number;
  l10nId?: string;
};

export const [panelSidebarAddModalState, setPanelSidebarAddModalState] =
  createSignal(false);

export class PanelSidebarAddModal {
  private static instance: PanelSidebarAddModal;
  public static getInstance() {
    if (!PanelSidebarAddModal.instance) {
      PanelSidebarAddModal.instance = new PanelSidebarAddModal();
    }
    return PanelSidebarAddModal.instance;
  }

  private get containers(): Container[] {
    return ContextualIdentityService.getPublicIdentities();
  }

  private get StyleElement() {
    return <style>{modalStyle}</style>;
  }

  private getContainerName(container: Container) {
    if (container.l10nId) {
      return ContextualIdentityService.getUserContextLabel(
        container.userContextId,
      );
    }
    return container.name;
  }

  private ContentElement() {
    const [type, setType] = createSignal<Panel["type"]>("web");
    const [extensions, setExtensions] = createSignal(getFirefoxSidebarPanels());

    createEffect(() => {
      if (panelSidebarAddModalState()) {
        console.log(getFirefoxSidebarPanels());
        setExtensions(getFirefoxSidebarPanels());
      }
    });

    return (
      <>
        <form>
          <label for="type">追加するパネルの種類</label>
          <select
            id="type"
            class="form-control"
            onChange={(e) =>
              setType((e.target as HTMLSelectElement).value as Panel["type"])
            }
          >
            <option value="web">ウェブページ</option>
            <option value="static">ツールサイドバー</option>
            <option value="extension">拡張機能のサイドバー</option>
          </select>

          <Show when={type() === "web"}>
            <label for="url">ウェブページのURL</label>
            <input
              id="url"
              class="form-control"
              placeholder="https://ablaze.one"
              value={window.gBrowser.currentURI.spec}
            />

            <label for="userContextId">コンテナ</label>
            <select id="userContextId" class="form-control" value={0}>
              <option value={0}>デフォルト</option>
              <For each={this.containers}>
                {(container) => (
                  <option value={container.userContextId}>
                    {this.getContainerName(container)}
                  </option>
                )}
              </For>
            </select>
            <div class="flex-row-gap">
              <input
                type="checkbox"
                id="userAgent"
                name="userAgent"
                value={"userAgent"}
              />
              <label for="userAgent">
                モバイル版のユーザーエージェントを使用する
              </label>
            </div>
          </Show>

          <Show when={type() === "extension"}>
            <label for="extension">表示する拡張機能</label>
            <xul:menulist
              class="form-control"
              flex="1"
              id="extension"
              value={undefined}
              label="サイドバー対応の拡張機能がインストールされていません"
            >
              <xul:menupopup id="extensionSelectPopup">
                <For each={extensions()}>
                  {(extension) => (
                    <xul:menuitem
                      value={extension.extensionId}
                      label={extension.title}
                      style={{
                        "list-style-image": `url(${extension.iconUrl})`,
                      }}
                    />
                  )}
                </For>
              </xul:menupopup>
            </xul:menulist>
          </Show>

          <Show when={type() === "static"}>
            <label for="sideBarTool">表示するサイドバーツール</label>
            <select id="sideBarTool" class="form-control" value={undefined}>
              <For each={Object.entries(STATIC_PANEL_DATA)}>
                {([key, panel]) => <option value={key}>{panel.l10n}</option>}
              </For>
            </select>
          </Show>

          <label for="width">パネルの幅</label>
          <input
            type="number"
            class="form-control"
            id="width"
            value={450}
            oninput={(e) => {
              let value = e.target.value.toLowerCase().replace(/[^0-9]/g, "");

              if (value === "") {
                value = "0";
              }

              const numValue = Number(value);
              if (numValue < 0) {
                value = "0";
              }

              e.target.value = value;
            }}
          />
        </form>
      </>
    );
  }

  private Modal() {
    return (
      <ShareModal
        name="パネルを追加"
        ContentElement={() => this.ContentElement()}
        StyleElement={() => this.StyleElement}
        onClose={() => setPanelSidebarAddModalState(false)}
        onGetFormError={(formControl) => {
          const errorElement = document?.querySelector(
            `form-control.${formControl.id}`,
          );
          if (errorElement) {
            errorElement.classList.add("error");
          }
        }}
        onSave={(formControls) => {
          console.log(formControls);
          setPanelSidebarAddModalState(false);
        }}
      />
    );
  }

  private PanelSidebarAddModal() {
    return <Show when={panelSidebarAddModalState()}>{this.Modal()}</Show>;
  }

  constructor() {
    render(
      () => this.PanelSidebarAddModal(),
      document?.getElementById("fullscreen-and-pointerlock-wrapper"),
      {
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        hotCtx: (import.meta as any)?.hot,
      },
    );

    render(() => this.StyleElement, document?.head, {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      hotCtx: (import.meta as any)?.hot,
    });
  }
}
