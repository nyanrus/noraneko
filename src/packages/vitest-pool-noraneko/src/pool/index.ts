import { ProcessPool, TestSpecification } from "vitest/node";

import { RunnerTaskResultPack, RunnerTestCase, RunnerTestFile } from "vitest";

class NoranekoTestPool implements ProcessPool {
  name: string = "vitest-noraneko-pool";
  async runTests(files: TestSpecification[],invalidates?: string[]) {
    for (const spec of files) {
      const ctx = spec.project.vitest;
      const project = spec.project;
      // fullpath of test file
      const path = spec.moduleId;

      // clear for when rerun
      ctx.state.clearFiles(project,[spec.moduleId]);

      // Register Test Files
      {
        const testFile: RunnerTestFile = {
          id: `${path}${project.name}`,
          name: path.split("/").at(-1),
          mode: 'run',
          meta: {typecheck:true},
          projectName: project.name,
          filepath: path,
          type: 'suite',
          tasks: [{
						"type":"test",
						"id": "aaa",
						"file": null!,
						"mode":"queued",
						"context":{},
						"name": "footest"
					} satisfies RunnerTestCase],
          result: {
            "state":"queued"
          },
          file: null!,
        }
        testFile.file = testFile
				testFile.tasks.forEach((v)=>v.file = testFile)
        ctx.state.collectFiles(project,[testFile])
      }

      // Update state of Test with id
      ctx.state.updateTasks([[
        `${path}${project.name}`,
        {
          "state":"pass",
        },
        null,
      ] satisfies RunnerTaskResultPack]);
			ctx.state.updateTasks([[
        `aaa`,
        {
          "state":"run",
					"startTime":Date.now(),
					"duration": 0,
        },
        null,
      ] satisfies RunnerTaskResultPack]);

			const st = Date.now();
			while (1) {
				const delay = (ms:number) => new Promise(resolve => setTimeout(resolve, ms));
				ctx.state.updateTasks([[
					`aaa`,
					{
						"state":"run",
						"duration": Date.now() - st,
					},
					null,
				] satisfies RunnerTaskResultPack]);
				await delay(50);
				if (Date.now() - st > 2000) {
					break;
				}
			}
			ctx.state.updateTasks([[
				`aaa`,
				{
					"state":"pass",
					"duration": Date.now() - st,
				},
				null,
			] satisfies RunnerTaskResultPack]);
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