/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {
  VStack,
  Text,
  Divider,
  Flex,
  Switch,
  FormLabel,
  FormControl,
  FormHelperText,
  Select,
  Input,
  Alert,
  AlertDescription,
  AlertIcon,
  Link,
} from "@chakra-ui/react";
import Card from "@/components/Card";
import React from "react";
import { Controller, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

export default function Preferences() {
  const { t } = useTranslation();
  const { control } = useFormContext();

  return (
    <>
      <Card
        icon={
          <IconLucideSidebar style={{ fontSize: "24px", color: "#6e05d1" }} />
        }
        title={"パネルサイドバーの基本設定"}
        footerLink="https://docs.floorp.app/docs/features/how-to-use-workspaces"
        footerLinkText={"パネルサイドバーの使い方と機能、カスタマイズについて"}
      >
        <VStack align="stretch" spacing={4} paddingInlineStart={"10px"}>
          <Text fontSize="lg">有効化・無効化</Text>
          <FormControl>
            <Flex justifyContent="space-between">
              <FormLabel flex={1}>パネルサイドバーを有効にする</FormLabel>
              <Controller
                name="enabled"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Switch
                    colorScheme={"blue"}
                    onChange={(e) => {
                      onChange(e.target.checked);
                    }}
                    isChecked={value}
                  />
                )}
              />
            </Flex>
            <FormHelperText mt={0}>
              パネルサイドバーは Firefox
              のサイドバーと異なるため、互いに干渉することはありません。
              パネルサイドバーは Firefox
              のサイドバーと異なりウェブページを表示することも可能です。ワークスペース機能を表示したサイドバーで管理することもできます。
            </FormHelperText>
          </FormControl>

          <Divider />

          <Text fontSize="lg">その他のパネルサイドバー設定</Text>
          <FormControl>
            <Flex justifyContent="space-between">
              <FormLabel flex={1}>パネルを閉じるたびに終了する</FormLabel>
              <Controller
                name="closePopupAfterClick"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Switch
                    colorScheme={"blue"}
                    onChange={(e) => onChange(e.target.checked)}
                    isChecked={value}
                  />
                )}
              />
            </Flex>
          </FormControl>

          <FormControl>
            <Flex justifyContent="space-between">
              <FormLabel flex={1}>サイドバーを表示する位置</FormLabel>
              <Controller
                name="showWorkspaceNameOnToolbar"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Select
                    width={"150px"}
                    variant="filled"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                  >
                    <option value="left">左側</option>
                    <option value="right">右側</option>
                  </Select>
                )}
              />
            </Flex>
          </FormControl>

          <FormControl>
            <Flex justifyContent="space-between">
              <FormLabel flex={1}>ウェブパネルの幅のグローバル値</FormLabel>
              <Controller
                name="manageOnBms"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Input
                    type="number"
                    value={value}
                    width={"150px"}
                    onChange={(e) => onChange(Number(e.target.value))}
                  />
                )}
              />
            </Flex>
            <FormHelperText>
              グローバル値はパネルに対して 0
              の幅が設定されている場合に適用されます。
            </FormHelperText>
            <Alert status="info" rounded={"md"} mt={4}>
              <AlertIcon />
              <AlertDescription>
                Noraneko
                は可能な限りパネルアイコンをウェブページから直接取得するようになったため、アイコンプロバイダーの設定は削除されました。
                <br />
                <Link
                  color="blue.500"
                  href="https://docs.floorp.app/docs/features/how-to-use-workspaces"
                >
                  詳細情報
                </Link>
              </AlertDescription>
            </Alert>
          </FormControl>
        </VStack>
      </Card>
    </>
  );
}
