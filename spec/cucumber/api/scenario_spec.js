require('../../support/spec_helper');

describe("Cucumber.Api.Scenario", function () {
  var Cucumber = requireLib('cucumber');
  var failureException, scenarioResult;
  var keyword, name, description, uri, line, tags, astScenario;
  var scenario;

  beforeEach(function () {
    keyword            = createSpy("scenario keyword");
    name               = createSpy("scenario name");
    description        = createSpy("scenario description");
    uri                = createSpy("scenario uri");
    line               = createSpy("scenario starting line number");
    tags               = createSpy("scenario tags");
    astScenario        = createSpyWithStubs("ast scenario", { getKeyword: keyword, getName: name, getDescription: description, getUri: uri, getLine: line, getTags: tags });

    failureException = createSpy("failure exception");
    scenarioResult     = createSpyWithStubs("scenario result", { getStatus: null, getFailureException: failureException });

    scenario = Cucumber.Api.Scenario(astScenario, scenarioResult);
  });

  describe("getKeyword()", function () {
    it("returns the keyword of the scenario", function () {
      expect(scenario.getKeyword()).toBe(keyword);
    });
  });

  describe("getName()", function () {
    it("returns the name of the scenario", function () {
      expect(scenario.getName()).toBe(name);
    });
  });

  describe("getDescription()", function () {
    it("returns the description of the scenario", function () {
      expect(scenario.getDescription()).toBe(description);
    });
  });

  describe("getUri()", function () {
    it("returns the URI on which the background starts", function () {
      expect(scenario.getUri()).toBe(uri);
    });
  });

  describe("getLine()", function () {
    it("returns the line on which the scenario starts", function () {
      expect(scenario.getLine()).toBe(line);
    });
  });

  describe("getTags()", function () {
    it("returns the tags on the scenario, including inherited tags", function () {
      expect(scenario.getTags()).toBe(tags);
    });
  });

  describe("isSuccessful()", function () {
    describe('scenario passed', function () {
      beforeEach(function() {
        scenarioResult.getStatus.and.returnValue(Cucumber.Status.PASSED);
      });

      it("returns true", function () {
        expect(scenario.isSuccessful()).toEqual(true);
      });
    });

    describe('scenario did not pass', function () {
      it("returns false", function () {
        expect(scenario.isSuccessful()).toEqual(false);
      });
    });
  });

  describe("isFailed()", function () {
    describe('scenario failed', function () {
      beforeEach(function() {
        scenarioResult.getStatus.and.returnValue(Cucumber.Status.FAILED);
      });

      it("returns true", function () {
        expect(scenario.isFailed()).toEqual(true);
      });
    });

    describe('scenario did not fail', function () {
      it("returns false", function () {
        expect(scenario.isFailed()).toEqual(false);
      });
    });
  });

  describe("isPending()", function () {
    describe('scenario is pending', function () {
      beforeEach(function() {
        scenarioResult.getStatus.and.returnValue(Cucumber.Status.PENDING);
      });

      it("returns true", function () {
        expect(scenario.isPending()).toEqual(true);
      });
    });

    describe('scenario is not pending', function () {
      it("returns false", function () {
        expect(scenario.isPending()).toEqual(false);
      });
    });
  });

  describe("isUndefined()", function () {
    describe('scenario is undefined', function () {
      beforeEach(function() {
        scenarioResult.getStatus.and.returnValue(Cucumber.Status.UNDEFINED);
      });

      it("returns true", function () {
        expect(scenario.isUndefined()).toEqual(true);
      });
    });

    describe('scenario is not undefined', function () {
      it("returns false", function () {
        expect(scenario.isUndefined()).toEqual(false);
      });
    });
  });

  describe("isSkipped()", function () {
    describe('scenario is skipped', function () {
      beforeEach(function() {
        scenarioResult.getStatus.and.returnValue(Cucumber.Status.SKIPPED);
      });

      it("returns true", function () {
        expect(scenario.isSkipped()).toEqual(true);
      });
    });

    describe('scenario is not skipped', function () {
      it("returns false", function () {
        expect(scenario.isSkipped()).toEqual(false);
      });
    });
  });

  describe("getException()", function () {
    it("returns the exception raised when running the scenario", function () {
      expect(scenario.getException()).toBe(failureException);
    });
  });

  describe("attach()", function () {
    var mimeType, callback;

    beforeEach(function () {
      mimeType = createSpy("mime type");
      callback = createSpy("callback");
    });

    describe("when the data is a stream.Readable", function () {
      var stream;

      beforeEach(function () {
        stream = {pipe: function () {}};
      });

      it("throws an exception when the mimeType argument is missing", function () {
        expect(function () { scenario.attach(stream); }).toThrow(new Error("Cucumber.Api.Scenario.attach() expects a mimeType"));
      });

      it("throws an exception when the callback argument is missing", function () {
        expect(function () { scenario.attach(stream, mimeType); }).toThrow(new Error("Cucumber.Api.Scenario.attach() expects a callback when data is a stream.Readable"));
      });

      describe("when it reads the stream", function () {
        var dataListener, endListener;

        beforeEach(function () {
          spyOnStub(stream, "on").and.callFake(function (event, listener) {
            if (event === "data") {
              dataListener = listener;
            }
            else if (event === "end") {
              endListener = listener;
            }
            else {
              throw new Error("Unrecognised event " + event);
            }
          });
          scenario.attach(stream, mimeType, callback);
        });

        it("does not call back straight away", function () {
          expect(callback).not.toHaveBeenCalled();
        });

        it("listens for the data event on the stream", function () {
          expect(dataListener).toBeAFunction();
        });

        it("listens for the end event on the stream", function () {
          expect(endListener).toBeAFunction();
        });

        describe("when the stream finishes providing data", function () {
          beforeEach(function () {
            dataListener(new Buffer("first chunk"));
            dataListener(new Buffer("second chunk"));
            endListener();
          });

          it("saves the attachment with the contents of the stream", function () {
            var attachments = scenario.getAttachments();
            expect(attachments.length).toEqual(1);
            var attachment = attachments[0];
            expect(attachment.getData()).toEqual("first chunksecond chunk");
            expect(attachment.getMimeType()).toEqual(mimeType);
          });

          it("calls back", function () {
            expect(callback).toHaveBeenCalled();
          });
        });
      });
    });

    describe("when the data is a Buffer", function () {
      var buffer;

      beforeEach(function () {
        buffer = new Buffer("data");
      });

      it("throws an exception when the mimeType argument is missing", function () {
        expect(function () { scenario.attach(buffer); }).toThrow(new Error("Cucumber.Api.Scenario.attach() expects a mimeType"));
      });

      it("saves the attachment containing the contents of the buffer", function () {
        scenario.attach(buffer, mimeType);
        var attachments = scenario.getAttachments();
        expect(attachments.length).toEqual(1);
        var attachment = attachments[0];
        expect(attachment.getData()).toEqual("data");
        expect(attachment.getMimeType()).toEqual(mimeType);
      });

      describe("when provided with a callback", function () {
        beforeEach(function () {
          scenario.attach(buffer, mimeType, callback);
        });

        it("calls back", function () {
          expect(callback).toHaveBeenCalled();
        });
      });

      describe("when not provided with a callback", function () {
        beforeEach(function () {
          scenario.attach(buffer, mimeType);
        });

        it("does not call back", function () {
          expect(callback).not.toHaveBeenCalled();
        });
      });
    });

    describe("when the data is a string", function () {
      var data;

      beforeEach(function () {
        data = "data";
      });

      it("saves the attachment containing the string", function () {
        scenario.attach(data, mimeType);
        var attachments = scenario.getAttachments();
        expect(attachments.length).toEqual(1);
        var attachment = attachments[0];
        expect(attachment.getData()).toEqual("data");
        expect(attachment.getMimeType()).toEqual(mimeType);
      });

      it("defaults to the plain text mime type when the mimeType argument is missing", function () {
        scenario.attach(data);
        var attachments = scenario.getAttachments();
        expect(attachments.length).toEqual(1);
        var attachment = attachments[0];
        expect(attachment.getData()).toEqual("data");
        expect(attachment.getMimeType()).toEqual("text/plain");
      });

      it("calls back if a callback is given", function () {
        var callback = createSpy();
        scenario.attach(data, null, callback);
        expect(callback).toHaveBeenCalled();
      });
    });
  });
});
