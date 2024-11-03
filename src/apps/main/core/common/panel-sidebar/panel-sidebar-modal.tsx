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

createEffect(() => {
  console.log(panelSidebarAddModalState());
});

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
      console.log(type());
    });

    createEffect(() => {
      if (panelSidebarAddModalState()) {
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
            />
          </Show>

          <Show when={type() === "extension"}>
            <label for="extension">表示する拡張機能</label>
            <xul:menulist
              class="form-control"
              flex="1"
              id="extension"
              value={undefined}
              label="拡張機能を選択してください"
            >
              <xul:menupopup id="extensionSelectPopup">
                <For each={extensions()}>
                  {(extension) => (
                    <xul:menuitem
                      value={extension.keyId}
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
