import { ProcessPool, TestSpecification } from "vitest/node";

import { RunnerTaskResultPack, RunnerTestCase, RunnerTestFile } from "vitest";
import {generateFileHash, getTasks} from "@vitest/runner/utils"
import { relative } from "pathe";

class NoranekoTestPool implements ProcessPool {
  name: string = "vitest-noraneko-pool";
  async runTests(files: TestSpecification[],invalidates?: string[]) {
    for (const spec of files) {
      const ctx = spec.project.vitest;
      const project = spec.project;
      // fullpath of test file
      // const path = spec.moduleId;

      // clear for when rerun
      ctx.state.clearFiles(project);
      const path = relative(project.config.root, spec.moduleId)
      // Register Test Files
      {
        const testFile: RunnerTestFile = {
          id: generateFileHash(path, project.config.name),
          name: path,
          mode: 'run',
          meta: {typecheck:true},
          projectName: project.name,
          filepath: path,
          type: 'suite',
          tasks:[],
          result: {
            state:"pass"
          },
          file: null!,
        }
        testFile.file = testFile

        const taskTest: RunnerTestCase = {
          type: 'test',
          name: 'custom test',
          id: 'custom-test',
          context: {} as any,
          suite: testFile,
          mode: 'run',
          meta: {},
          result: {
            state:"pass"
          },
          file: testFile,
        }

        testFile.tasks.push(taskTest)

        ctx.state.collectFiles(project,[testFile])
        ctx.state.updateTasks(getTasks(testFile).map(task => [
          task.id,
          task.result,
          task.meta,
        ]));
      }
    }
  }
  collectTests(files: TestSpecification[],invalidates?: string[]){
    for (const file of files) {
      console.log(file.moduleId);
    }
  }
  async close() : Promise<void>{

  }

}

export default () => new NoranekoTestPool()